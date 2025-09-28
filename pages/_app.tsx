import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/next"
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Cellular Automaton</title>
        <link rel="icon" href={`./favicon.ico`} />
      </Head>
      <Component {...pageProps} />
      <Analytics />
    </>
);
}
