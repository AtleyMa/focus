import Foundation

enum FocusRules {
    static let remoteURL = URL(string: "https://raw.githubusercontent.com/AtleyMa/focus/main/focus.user.js")!

    /// Source injected into every page load.
    /// Uses the cached remote copy (previous launch) when present, else the bundled one.
    static var scriptSource: String {
        if let cached = cachedScript(), !cached.isEmpty {
            return cached
        }
        return bundledScript()
    }

    /// Fetch the latest rules from GitHub on launch and cache them for next launch.
    /// New filters take effect on the next app launch.
    static func refresh() {
        var request = URLRequest(url: remoteURL)
        request.timeoutInterval = 15
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard
                let data,
                let text = String(data: data, encoding: .utf8),
                let http = response as? HTTPURLResponse,
                http.statusCode == 200,
                text.contains("==UserScript=="),
                text.contains("@version")
            else { return }
            try? text.write(to: cacheURL(), atomically: true, encoding: .utf8)
        }.resume()
    }

    private static func bundledScript() -> String {
        guard
            let url = Bundle.main.url(forResource: "focus", withExtension: "js"),
            let text = try? String(contentsOf: url, encoding: .utf8)
        else { return "" }
        return text
    }

    private static func cachedScript() -> String? {
        guard FileManager.default.fileExists(atPath: cacheURL().path) else { return nil }
        return try? String(contentsOf: cacheURL(), encoding: .utf8)
    }

    private static func cacheURL() -> URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
            .appendingPathComponent("focus.user.js")
    }
}