import { run } from '@/lib/client';

export default function Home() {
  try {
    run().then(r => console.log(r));
  } catch (e) {
    console.error(e);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h2>Monaco Language Client Kotlin Example</h2>
      <div id="container" style={{ height: '50vh' }}></div>
    </main>
  )
}
