export default function PerceptualLearningLandingPage() {
  const navItems = [
    "How It Works",
    "Features",
    "For Teachers",
    "Contact",
  ];

  const steps = [
    {
      title: "Assign weekly assessments",
      description:
        "Deliver spiral, standards-aligned post-tests that reveal student understanding across your key clusters.",
    },
    {
      title: "Analyze student thinking",
      description:
        "Use AI-supported review to identify likely misconceptions, not just incorrect answers.",
    },
    {
      title: "Act in real time",
      description:
        "Track live mastery, group students by need, and target instruction before gaps grow.",
    },
  ];

  const features = [
    {
      title: "AI misconception detection",
      description:
        "Surface patterns like reversed ratios, sign errors, or combining unlike terms with teacher review built in.",
    },
    {
      title: "Live standards mastery tracker",
      description:
        "Monitor student progress by standard, cluster, class, and week with a clear visual mastery view.",
    },
    {
      title: "Google-ready workflow",
      description:
        "Support Google login now and leave room for future Google Classroom sync for classes and rosters.",
    },
    {
      title: "Instructional action steps",
      description:
        "Turn assessment data into small groups, targeted follow-up, and next-step feedback for students.",
    },
  ];

  const previews = [
    {
      title: "Response review",
      subtitle: "See work, score with confidence, and review AI feedback.",
    },
    {
      title: "Mastery tracker",
      subtitle: "Track standards live with color-coded mastery trends.",
    },
    {
      title: "Misconception insights",
      subtitle: "Spot class-wide patterns and group students by need.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_25%)] pointer-events-none" />
      <header className="sticky top-0 z-40 border-b border border-white/10 shadow-lg shadow-black/30 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500/20 ring-1 ring-blue-400/30">
              <span className="text-lg font-bold text-blue-300">P</span>
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">PerceptualLearning</p>
              <p className="text-xs text-slate-400">See how students think</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm text-slate-300 transition hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/5 backdrop-blur-xl backdrop-blur-xl sm:inline-flex">
              Log In
            </button>
            <button className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400">
              Continue with Google
            </button>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-7xl gap-14 px-6 py-16 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">

  {/* LEFT SIDE */}
  <div>
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm text-blue-200">
      AI-powered standards mastery and misconception tracking
    </div>

    <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
      See how your students think, not just what they get wrong.
    </h1>

    <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
      PerceptualLearning helps teachers analyze student reasoning,
      identify likely misconceptions, and track live standards mastery.
    </p>

    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
      <a href="/demo">
  <button className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500">
    Try Demo
  </button>
</a>

      <button className="rounded-2xl border border-white/20 px-6 py-3 text-base font-semibold text-white hover:bg-white/10">
        Request Demo
      </button>
    </div>
  </div>

  {/* RIGHT SIDE (YOUR IMAGE) */}
  <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-2xl shadow-black/40">
    <img
      src="/mockup.png"
      alt="Platform preview"
      className="rounded-2xl w-full h-auto"
    />
  </div>

</section>

        <section className="border-y border border-white/10 shadow-lg shadow-black/30 bg-slate-900/60">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-2 lg:px-8">
            <div className="rounded-3xl border border border-white/10 shadow-lg shadow-black/30 bg-white/5 backdrop-blur-xl backdrop-blur-xl p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                The problem
              </p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight">
                Most assessment tools tell you what students missed, not why.
              </h3>
              <p className="mt-4 max-w-xl text-slate-300">
                Scores alone do not reveal whether a student reversed a ratio,
                misunderstood like terms, or confused integer operations.
                Teachers need faster insight into student thinking.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border border-white/10 shadow-lg shadow-black/30 bg-slate-950/70 p-6">
                <p className="text-sm font-semibold text-slate-400">Traditional tools</p>
                <div className="mt-8 rounded-2xl border border border-white/10 shadow-lg shadow-black/30 bg-white/5 backdrop-blur-xl backdrop-blur-xl p-5">
                  <p className="text-sm text-slate-400">Question score</p>
                  <p className="mt-2 text-4xl font-semibold text-white">60%</p>
                  <p className="mt-4 text-sm text-slate-400">No misconception detail</p>
                </div>
              </div>
              <div className="rounded-3xl border border-blue-400/20 bg-blue-600 hover:bg-blue-500/10 p-6">
                <p className="text-sm font-semibold text-blue-200">PerceptualLearning</p>
                <div className="mt-8 rounded-2xl border border border-white/10 shadow-lg shadow-black/30 bg-slate-950/70 p-5">
                  <p className="text-sm text-slate-400">Question insight</p>
                  <p className="mt-2 text-xl font-semibold text-white">Reversed ratio detected</p>
                  <p className="mt-4 text-sm text-slate-300">Standard tagged. Feedback generated. Intervention ready.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
              How it works
            </p>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              A weekly workflow built for real classrooms.
            </h3>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-3xl border border border-white/10 shadow-lg shadow-black/30 bg-white/5 backdrop-blur-xl backdrop-blur-xl p-8 shadow-lg shadow-black/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500/15 text-lg font-semibold text-blue-200 ring-1 ring-blue-400/20">
                  {index + 1}
                </div>
                <h4 className="mt-6 text-xl font-semibold text-white">{step.title}</h4>
                <p className="mt-3 leading-7 text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
                Features
              </p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything centers around student thinking.
              </h3>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-3xl border border border-white/10 shadow-lg shadow-black/30 bg-white/5 backdrop-blur-xl backdrop-blur-xl p-8"
                >
                  <h4 className="text-xl font-semibold text-white">{feature.title}</h4>
                  <p className="mt-3 leading-7 text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
                Built for teachers
              </p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Designed for the way teachers actually assess.
              </h3>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
                PerceptualLearning supports weekly spiral assessment,
                standards-based reporting, quick teacher review, and future
                Google Classroom syncing without forcing teachers into a clunky
                grading workflow.
              </p>
              <ul className="mt-8 space-y-4 text-slate-300">
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400" />
                  Continue with Google sign-in for simple onboarding
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400" />
                  Live standards mastery by student, class, and week
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400" />
                  Misconception patterns that turn into instructional action
                </li>
              </ul>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {previews.map((preview) => (
                <div
                  key={preview.title}
                  className="rounded-3xl border border border-white/10 shadow-lg shadow-black/30 bg-gradient-to-b from-white/10 to-white/5 p-5"
                >
                  <div className="mb-4 h-36 rounded-2xl border border border-white/10 shadow-lg shadow-black/30 bg-slate-950/70 p-3">
                    <div className="space-y-2">
                      <div className="h-3 w-20 rounded-full bg-blue-400/50" />
                      <div className="h-3 w-28 rounded-full bg-white/15" />
                      <div className="mt-4 grid gap-2">
                        <div className="h-10 rounded-xl bg-white/10" />
                        <div className="h-10 rounded-xl bg-white/5 backdrop-blur-xl backdrop-blur-xl" />
                        <div className="h-10 rounded-xl bg-white/10" />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-white">{preview.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{preview.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border border-white/10 shadow-lg shadow-black/30 bg-slate-900/70">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <div className="rounded-[32px] border border-blue-400/20 bg-blue-600 hover:bg-blue-500/10 px-8 py-10 text-center shadow-2xl shadow-blue-950/30">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
                Get started
              </p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Start seeing student thinking today.
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-200">
                Bring together assessment, misconceptions, and mastery tracking
                in one teacher-friendly platform.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button className="rounded-2xl bg-white px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-slate-100">
                  Continue with Google
                </button>
                <button className="rounded-2xl border border-white/20 px-6 py-3 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/5 backdrop-blur-xl backdrop-blur-xl">
                  Request Demo
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border border-white/10 shadow-lg shadow-black/30 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-medium text-slate-300">PerceptualLearning</p>
            <p className="mt-1">AI-supported standards mastery and misconception tracking for teachers.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <a href="#" className="transition hover:text-white">Privacy</a>
            <a href="#" className="transition hover:text-white">Terms</a>
            <a href="#" className="transition hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}