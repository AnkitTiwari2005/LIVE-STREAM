import JoinPrivateStreamClient from './JoinPrivateStreamClient';

export async function generateStaticParams() {
  return [{ tokenSlug: 'invite' }];
}

export default function JoinPrivateStreamPage() {
  return <JoinPrivateStreamClient />;
}
