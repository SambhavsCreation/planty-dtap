import './globals.css';

export const metadata = {
  title: 'Plant Monitor',
  description: 'Track plant soil moisture and ambient light readings.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
