import SwiftUI
import Charts

// Same as the web's Price history: a step line on to today, then one row per change, newest first.
struct PriceHistory: View {
    let points: [[Double]]
    let currency: String

    private func date(_ day: Double) -> Date { Date(timeIntervalSince1970: day * 86400) }
    private func money(_ p: Double) -> String { p.formatted(.currency(code: currency).precision(.fractionLength(0))) }
    // Days are UTC days, as the server counts them.
    private var dayStyle: Date.FormatStyle { var f = Date.FormatStyle.dateTime.month(.abbreviated).day(); f.timeZone = .gmt; return f }
    private var today: Double { (Date().timeIntervalSince1970 / 86400).rounded(.down) }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            Text("Price history").font(.headline)
            VStack(spacing: 0) {
                Chart {
                    ForEach(points + [[max(today, points.last![0]), points.last![1]]], id: \.self) { p in
                        LineMark(x: .value("Day", date(p[0])), y: .value("Price", p[1]))
                            .interpolationMethod(.stepEnd)
                            .foregroundStyle(Color.accentColor)
                    }
                }
                .chartXAxis(.hidden).chartYAxis(.hidden)
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 48)
                .padding(.vertical, Space.m - Space.xs).padding(.horizontal, Space.m)
                ForEach(points.reversed(), id: \.self) { p in
                    Divider().padding(.leading, Space.m)
                    HStack {
                        Text(date(p[0]).formatted(dayStyle)).foregroundStyle(.secondary)
                        Spacer()
                        Text(money(p[1]))
                    }
                    .padding(.vertical, Space.m - Space.xs).padding(.horizontal, Space.m)
                }
            }
            .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: Space.grouped, style: .continuous))
        }
    }
}
