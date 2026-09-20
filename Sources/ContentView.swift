import SwiftUI

struct ContentView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            FocusWebView()
        }
    }
}

struct FocusWebView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}