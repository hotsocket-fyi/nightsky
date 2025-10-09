# Nightsky

_Bluesky client guided through the night by a [Constellation](http://constellation.microcosm.blue/) and propelled by a
[Slingshot](https://slingshot.microcosm.blue)._

> [!CAUTION]
> This project is far from being considered complete, and should not be considered totally reliable.

> [!NOTE]
> This was built using Chrome to test/debug. There are currently no guarantees it will work perfectly in a non-Chrome
> browser.

> [!WARNING]
> While this client does most of its work in your browser, your refresh token is stored using a cookie (and therefore
> shared with the server) in an attempt to secure it against [XSS attacks](https://owasp.org/www-community/attacks/xss).
>
> If this makes you uncomfortable, you can review the app's code yourself, and run your own copy of it by doing the
> following:

## Deploy your own!

_If you face any trouble with these steps, please do [make an issue](https://github.com/hotsocket-fyi/nightsky/issues)._

- [Create a GitHub app](https://github.com/settings/apps), no need to add extra permissions.
- Keep the Client ID in the app settings handy, this will be your `GITHUB_CLIENTID` variable.
- Scroll to the "Private keys" section of the app settings to create create a new one.
- Run the following in your (macOS, maybe Linux) terminal:
  `openssl rsa -in /path/to/downloaded.pem -outform der | b64encode -rw0 -`
  - The output of this will be your `GITHUB_PKEY` environment variable
- Click this fancy button, and insert your environment variables accordingly:

[![Deploy on Deno](https://deno.com/button)](https://console.deno.com/new?clone=https://github.com/hotsocket-fyi/nightsky)

## Note to the Nerds

im sorry for using ancient + fucked up adhd code in `support/` it was just too easy

also by the way i try to add classes to things even when i dont style them so you can screw with them in userstyle
stuff. get yourself some catppuccin action if you want.
