const PageLayout = ({ children }) => (
  <div className="min-h-screen bg-[#0d0d0f]">
    {children}
  </div>
);

export const PageBody = ({ children }) => (
  <main className="mx-auto max-w-[1200px] px-6 py-8">
    {children}
  </main>
);

export default PageLayout;
