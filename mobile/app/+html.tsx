import type { ReactNode } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>ShobdoLab</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
  overflow-x: hidden;
  background: #FAFAFA;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
* {
  box-sizing: border-box;
}
body {
  overscroll-behavior-y: none;
  touch-action: manipulation;
}
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
