import "./globals.css";
import AppFrame from "@/components/AppFrame";

export const metadata = {
  title: "B Socio Studio",
  description: "Be Seen. Be Social. Digital marketing agency management software."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
