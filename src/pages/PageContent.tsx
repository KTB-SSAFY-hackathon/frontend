import './PageContent.css'

type PageContentProps = {
  title: string
  description: string
}

export function PageContent({ title, description }: PageContentProps) {
  return (
    <section className="app-panel">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
