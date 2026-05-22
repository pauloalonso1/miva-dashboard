import { redirect } from 'next/navigation';

// O dashboard estático fica em /index.html (public/index.html)
export default function Home() {
  redirect('/index.html');
}
