export default function Home() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-4 text-primary">Welcome to SkillVerse</h1>
      <p className="text-lg text-foreground opacity-80 mb-8">
        Your dynamic skill-based social marketplace. Connect, showcase, and monetize.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-lg border border-border bg-background shadow-xs">
          <h2 className="text-xl font-bold mb-2">Social Feed</h2>
          <p className="text-sm opacity-70">Share content and interact with other skilled professionals.</p>
        </div>
        <div className="p-6 rounded-lg border border-border bg-background shadow-xs">
          <h2 className="text-xl font-bold mb-2">Marketplace</h2>
          <p className="text-sm opacity-70">Sell your digital products, tutorials, and templates.</p>
        </div>
      </div>
    </div>
  )
}
