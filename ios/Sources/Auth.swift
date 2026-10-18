import SwiftUI
import AuthenticationServices
import CryptoKit
import Security

// Same account as the web app: jaybulb-api, email and password or Sign in with Apple.
// The refresh token lives in the Keychain; the short-lived access token stays in memory.
@MainActor @Observable
final class Auth {
    struct User: Codable, Equatable { let id: String; let email: String?; var name: String?; var provider: String? }

    private static let api = "https://api.jaybulb.com"
    private static let service = "com.nulljosh.brick.session"

    var user: User?
    var favorites: [String] = []
    // Saved searches as the web writes them, kept as raw JSON so a round trip never drops a field.
    var searches: [[String: Any]] = []
    var alerts = false
    var busy = false
    var error: String?
    var notice: String?
    private var access: String?
    private var nonce = ""

    init() { Task { await restore() } }

    // MARK: session

    private struct Session: Decodable {
        let access_token: String, refresh_token: String
        let user: Wire
        struct Wire: Decodable {
            let id: String, email: String?
            let user_metadata: Meta?
        }
        struct Meta: Decodable { let favorites: [String]? }
    }
    private struct Failure: Decodable { let error: String? }

    private func call(_ method: String, _ path: String, _ body: [String: Any]? = nil, authed: Bool = false) async throws -> Data {
        var r = URLRequest(url: URL(string: Self.api + path)!)
        r.httpMethod = method
        if let body { r.httpBody = try JSONSerialization.data(withJSONObject: body); r.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        if authed, let access { r.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization") }
        let (data, res) = try await URLSession.shared.data(for: r)
        guard let code = (res as? HTTPURLResponse)?.statusCode, code < 300 else {
            throw NSError(domain: "Atlin", code: 1, userInfo: [NSLocalizedDescriptionKey: (try? JSONDecoder().decode(Failure.self, from: data))?.error ?? "Something went wrong"])
        }
        return data
    }

    private func start(_ data: Data) throws {
        let s = try JSONDecoder().decode(Session.self, from: data)
        access = s.access_token
        Self.keychain(set: s.refresh_token)
        let meta = (((try? JSONSerialization.jsonObject(with: data)) as? [String: Any])?["user"] as? [String: Any])?["user_metadata"] as? [String: Any] ?? [:]
        // Apple and Google sign-ins arrive with full_name, email sign-ups with name.
        user = User(id: s.user.id, email: s.user.email, name: (meta["name"] as? String) ?? (meta["full_name"] as? String), provider: meta["provider"] as? String)
        favorites = s.user.user_metadata?.favorites ?? []
        searches = meta["searches"] as? [[String: Any]] ?? []
        alerts = meta["alerts"] as? Bool ?? false
    }

    private func restore() async {
        guard let token = Self.keychain() else { return }
        if let d = try? await call("POST", "/auth/token?grant_type=refresh_token", ["refresh_token": token]) { try? start(d) } else { Self.keychain(set: nil) }
    }

    // MARK: sign in

    func signIn(email: String, password: String) async {
        await run { try self.start(await self.call("POST", "/auth/token?grant_type=password", ["email": email, "password": password])) }
    }

    func signUp(email: String, password: String) async {
        await run {
            _ = try await self.call("POST", "/auth/signup", ["email": email, "password": password, "redirect_to": "https://atlin.jaybulb.com/browse"])
            self.notice = "Check your email to confirm your account, then sign in."
        }
    }

    func prepareApple(_ request: ASAuthorizationAppleIDRequest) {
        nonce = (0..<32).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined()
        request.requestedScopes = [.fullName, .email]
        request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    func finishApple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .failure(let e):
            if (e as? ASAuthorizationError)?.code != .canceled { error = e.localizedDescription }
        case .success(let auth):
            guard let c = auth.credential as? ASAuthorizationAppleIDCredential, let t = c.identityToken, let token = String(data: t, encoding: .utf8) else { error = "Apple did not return a sign-in"; return }
            // Apple sends the name once, on the very first sign-in, so pass it along now.
            let name = [c.fullName?.givenName, c.fullName?.familyName].compactMap { $0 }.joined(separator: " ")
            await run { try self.start(await self.call("POST", "/auth/token?grant_type=id_token", ["provider": "apple", "id_token": token, "nonce": self.nonce, "full_name": name])) }
        }
    }

    // MARK: Google: OAuth code flow with PKCE in the system web sheet, no SDK.
    // The iOS client has no secret; the verifier proves this app started the flow.

    static let googleClient = "337798947774-5r4r4ac0f7l10ctimfcig7v8t38ddq4d.apps.googleusercontent.com"
    static var googleScheme: String { "com.googleusercontent.apps." + googleClient.replacingOccurrences(of: ".apps.googleusercontent.com", with: "") }
    private var verifier = ""

    func googleURL() -> URL {
        verifier = (0..<48).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined()
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        var c = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        c.queryItems = [
            .init(name: "client_id", value: Self.googleClient),
            .init(name: "redirect_uri", value: Self.googleScheme + ":/oauth2redirect"),
            .init(name: "response_type", value: "code"),
            .init(name: "scope", value: "openid email profile"),
            .init(name: "code_challenge", value: challenge),
            .init(name: "code_challenge_method", value: "S256"),
        ]
        return c.url!
    }

    func finishGoogle(_ callback: URL) async {
        guard let code = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value else {
            error = "Google did not return a sign-in"; return
        }
        await run {
            var req = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
            req.httpMethod = "POST"
            req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            let form = ["code": code, "client_id": Self.googleClient, "redirect_uri": Self.googleScheme + ":/oauth2redirect", "grant_type": "authorization_code", "code_verifier": self.verifier]
            req.httpBody = form.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? "")" }.joined(separator: "&").data(using: .utf8)
            let (data, _) = try await URLSession.shared.data(for: req)
            struct Tokens: Decodable { let id_token: String? }
            guard let token = try JSONDecoder().decode(Tokens.self, from: data).id_token else { throw URLError(.userAuthenticationRequired) }
            try self.start(await self.call("POST", "/auth/token?grant_type=id_token", ["provider": "google", "id_token": token]))
        }
    }

    func signOut() async {
        _ = try? await call("POST", "/auth/logout", nil, authed: true)
        user = nil; access = nil; favorites = []; searches = []
        Self.keychain(set: nil)
    }

    // Apple requires this in the app itself (5.1.1v).
    func deleteAccount() async {
        await run {
            _ = try await self.call("DELETE", "/auth/user", nil, authed: true)
            self.user = nil; self.access = nil; self.favorites = []
            Self.keychain(set: nil)
        }
    }

    // MARK: saved homes: the same id list the web keeps in the profile

    func saveSearches(_ list: [[String: Any]]) async {
        searches = list
        guard user != nil else { return }
        _ = try? await call("PUT", "/auth/user", ["data": ["searches": list]], authed: true)
    }

    func setAlerts(_ on: Bool) async {
        alerts = on
        _ = try? await call("PUT", "/auth/user", ["data": ["alerts": on]], authed: true)
    }

    func setName(_ name: String) async {
        user?.name = name
        _ = try? await call("PUT", "/auth/user", ["data": ["name": name]], authed: true)
    }

    func saveFavorites(_ ids: [String]) async {
        favorites = ids
        guard user != nil else { return }
        _ = try? await call("PUT", "/auth/user", ["data": ["favorites": ids]], authed: true)
    }

    private func run(_ work: @escaping () async throws -> Void) async {
        busy = true; error = nil; notice = nil
        defer { busy = false }
        do { try await work() } catch { self.error = error.localizedDescription }
    }

    // MARK: keychain

    @discardableResult
    private static func keychain(set value: String?) -> Bool {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service]
        SecItemDelete(q as CFDictionary)
        guard let value else { return true }
        return SecItemAdd(q.merging([kSecValueData as String: Data(value.utf8)]) { $1 } as CFDictionary, nil) == errSecSuccess
    }
    private static func keychain() -> String? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }
}

// The account sheet: sign in, create an account, or manage the one you have.
struct AccountView: View {
    @Environment(Auth.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @Environment(\.webAuthenticationSession) private var webAuth
    @Environment(Store.self) private var store
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var creating = false
    @State private var confirmDelete = false

    private func initials(_ u: Auth.User) -> String {
        let source = u.name.flatMap { $0.isEmpty ? nil : $0 } ?? u.email ?? "?"
        return String(source.split(separator: " ").prefix(2).compactMap(\.first)).uppercased()
    }

    var body: some View {
        NavigationStack {
            Form {
                if let user = auth.user {
                    Section {
                        HStack(spacing: Space.m) {
                            Text(initials(user)).font(.title2.weight(.semibold)).foregroundStyle(.white)
                                .frame(width: 64, height: 64).background(Circle().fill(Color.accentColor))
                            VStack(alignment: .leading, spacing: Space.xs) {
                                Text(user.name.flatMap { $0.isEmpty ? nil : $0 } ?? user.email ?? "Signed in").font(.title3.weight(.semibold))
                                Text([user.email, user.provider == "apple" ? "Apple" : user.provider == "google" ? "Google" : nil].compactMap { $0 }.joined(separator: " · "))
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, Space.s)
                        LabeledContent("Saved homes", value: "\(store.saved.count)")
                        LabeledContent("Saved searches", value: "\(auth.searches.count)")
                    }
                    Section("Name") {
                        TextField("Name", text: $name).onSubmit { Task { await auth.setName(name) } }
                    }
                    Section(footer: Text("Daily email when a saved search has a new deal.")) {
                        Toggle("Email new deals", isOn: Binding(get: { auth.alerts }, set: { v in Task { await auth.setAlerts(v) } }))
                    }
                    if !auth.searches.isEmpty {
                        Section("Saved searches") {
                            ForEach(auth.searches.indices, id: \.self) { i in
                                Button((auth.searches[i]["label"] as? String) ?? "Search") { store.apply(search: auth.searches[i]); dismiss() }
                            }
                            .onDelete { rows in var list = auth.searches; list.remove(atOffsets: rows); Task { await auth.saveSearches(list) } }
                        }
                    }
                    Section {
                        Button("Sign out") { Task { await auth.signOut(); dismiss() } }
                        Button("Delete account", role: .destructive) { confirmDelete = true }
                    }
                } else {
                    Section {
                        SignInWithAppleButton(.continue, onRequest: { auth.prepareApple($0) }, onCompletion: { r in Task { await auth.finishApple(r) } })
                            .frame(height: Space.control)
                            .listRowInsets(EdgeInsets())
                        Button {
                            Task {
                                guard let url = try? await webAuth.authenticate(using: auth.googleURL(), callbackURLScheme: Auth.googleScheme) else { return }
                                await auth.finishGoogle(url)
                            }
                        } label: {
                            Text("Continue with Google").font(.body.weight(.medium)).frame(maxWidth: .infinity, minHeight: Space.control)
                        }
                        .buttonStyle(.bordered)
                        .buttonBorderShape(.capsule)
                        .listRowInsets(EdgeInsets(top: Space.s, leading: 0, bottom: 0, trailing: 0))
                        .listRowBackground(Color.clear)
                    }
                    Section {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            #if os(iOS)
                            .keyboardType(.emailAddress).textInputAutocapitalization(.never)
                            #endif
                        SecureField("Password", text: $password).textContentType(creating ? .newPassword : .password)
                        Button(creating ? "Create account" : "Sign in") {
                            Task { creating ? await auth.signUp(email: email, password: password) : await auth.signIn(email: email, password: password) }
                        }
                        .disabled(auth.busy || email.isEmpty || password.count < 8)
                        Button(creating ? "I have an account" : "Create an account") { creating.toggle(); auth.error = nil; auth.notice = nil }
                            .font(.footnote)
                    } footer: {
                        if let e = auth.error { Text(e).foregroundStyle(.secondary) } else if let n = auth.notice { Text(n) } else { Text("Browsing never needs an account. Saved homes follow you to the web.") }
                    }
                }
            }
            .formStyle(.grouped)
            .onAppear { name = auth.user?.name ?? "" }
            .navigationTitle(auth.user == nil ? "Sign in" : "Account")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete account and saved homes", role: .destructive) { Task { await auth.deleteAccount(); dismiss() } }
            } message: { Text("This removes your account and saved homes everywhere. It cannot be undone.") }
        }
        #if os(macOS)
        .frame(width: 460, height: 520)
        #endif
        .onChange(of: auth.user) { _, u in if u != nil { dismiss() } }
    }
}
