import { COPY } from '../content/descriptions'

export function Footer() {
  return (
    <footer className="border-t border-line dark:border-line-dark mt-16">
      <div className="mx-auto max-w-prose px-6 py-12 text-sm text-muted dark:text-muted-dark space-y-4">
        <p>{COPY.footer.method}</p>
        <p>
          <a
            href="https://github.com/ValiantEvers/ValiantEvers.github.io/tree/main/nb-watch-src"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-line dark:decoration-line-dark hover:text-ink dark:hover:text-ink-dark"
          >
            {COPY.footer.repo}
          </a>
        </p>
        <p className="text-xs">{COPY.footer.disclaimer}</p>
      </div>
    </footer>
  )
}
