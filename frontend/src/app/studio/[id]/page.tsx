import StudioClient from './StudioClient';

export async function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function StreamerStudioPage() {
  return <StudioClient />;
}
