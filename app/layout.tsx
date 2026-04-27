import "./globals.css";

export const metadata = {
  title: "PerceptualLearning",
  description: "Standards mastery and misconception tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}