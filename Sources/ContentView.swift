import SwiftUI

struct ContentView: View {
    @State private var blockedByScreenTime = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            FocusWebView { blockedByScreenTime = $0 }

            if blockedByScreenTime {
                VStack {
                    Spacer()
                    VStack(alignment: .leading, spacing: 8) {
                        Text("focus is blocked by Screen Time")
                            .font(.headline)
                        Text("Instagram's website (instagram.com) is still under a Screen Time limit, and that limit also applies inside focus.\n\nFix: Settings → Screen Time → App Limits → tap your Instagram limit → turn OFF \"Include Website\", or delete it and re-create it choosing \"Don't Include Website\". If Downtime is on, turn it off or add focus to Always Allowed.")
                            .font(.footnote)
                    }
                    .padding(16)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                    .padding(16)
                }
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}