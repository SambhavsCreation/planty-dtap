import './globals.css';

export const metadata = {
  title: 'Planty Patootie',
  description: 'Smart plant health monitor with AI-powered voice',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
