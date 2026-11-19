# YouTube Focus Chrome extension

This is separate from the YT-Focus command-line app. To install it, open
`chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and
choose this `extension/` folder.

Sign into the Google accounts you want to use in the same Chrome profile. In
the Focus home, search, or subscriptions list, press **1–5** to open the home
feed for the corresponding Google sign-in slot. The numbered slots follow
Google's sign-in order; the extension does not sign into accounts for you.
The hints show the selected slot, or `acct default` if YouTube is using its
default routing. Focus keeps the selected slot on links it opens.

Use **Shift+1–5** to quick-open one of the first five videos, or **6–9** for
the remaining quick-open slots. On the watch page, **1–5** still set playback
speed.

Run the shortcut and navigation tests with `node --test extension/content.test.cjs`
from the repository root.
