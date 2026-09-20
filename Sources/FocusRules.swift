import Foundation

enum FocusRules {
    static let remoteURL = URL(string: "https://raw.githubusercontent.com/AtleyMa/focus/main/focus.user.js")!

    /// Source injected into every page load.
    /// Uses whichever copy (bundled or cached remote) has the higher @version.
    static var scriptSource: String {
        let bundled = bundledScript()
        let cached = cachedScript() ?? ""
        if cached.isEmpty { return bundled }
        return isNewer(version(cached), than: version(bundled)) ? cached : bundled
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
            let url = Bundle.main.url(forResource: "focus.user", withExtension: "js"),
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

    private static func version(_ script: String) -> (major: Int, minor: Int, patch: Int) {
        var major = 0, minor = 0, patch = 0
        let pattern = "@version\\s+([0-9]+)(?:\\.([0-9]+))?(?:\\.([0-9]+))?"
        if let regex = try? NSRegularExpression(pattern: pattern),
           let match = regex.firstMatch(in: script, range: NSRange(script.startIndex..., in: script)) {
            func num(_ idx: Int) -> Int {
                guard idx < match.numberOfRanges else { return 0 }
                let r = match.range(at: idx)
                if r.location == NSNotFound { return 0 }
                return Int((script as NSString).substring(with: r)) ?? 0
            }
            major = num(1); minor = num(2); patch = num(3)
        }
        return (major, minor, patch)
    }

    private static func isNewer(_ a: (major: Int, minor: Int, patch: Int), than b: (major: Int, minor: Int, patch: Int)) -> Bool {
        (a.major, a.minor, a.patch) > (b.major, b.minor, b.patch)
    }
}