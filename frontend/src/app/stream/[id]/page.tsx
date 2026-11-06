import StreamPlayerClient from './StreamPlayerClient';

export async function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function StreamPlayerPage() {
  return <StreamPlayerClient />;
}
