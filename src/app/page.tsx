import App from "../components/App";

export const dynamic = "force-dynamic";

export default function Page() {
  return <App demoMode={!process.env.OPENAI_API_KEY?.trim()} production={process.env.NODE_ENV === "production"} />;
}
