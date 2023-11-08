import { ResolvingForm } from "./components/resolvingForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="mb-32 text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:text-left">
        <ResolvingForm />
      </div>
    </main>
  );
}
