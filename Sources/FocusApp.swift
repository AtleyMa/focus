import SwiftUI

@main
struct FocusApp: App {
    init() {
        FocusRules.refresh()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}