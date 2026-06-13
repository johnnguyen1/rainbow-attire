export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} Rainbow Attire. All rights reserved.</p>
        <p>Customized business apparel and promotional products</p>
      </div>
    </footer>
  );
}
