import PanditProfileClient from './PanditProfileClient';

export async function generateStaticParams() {
  return [
    { id: 'aarav-sharma' },
    { id: 'hariram-vyas' },
    { id: 'vishwanath-bhatt' },
    { id: 'devrishi' },
  ];
}

export default function PanditProfilePage() {
  return <PanditProfileClient />;
}
