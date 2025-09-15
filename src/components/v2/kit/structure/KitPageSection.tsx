export default function KitPageSection({
 children,
 className = '',
 layout = 'section',
 id = ''
}: {
  children: React.ReactNode;
  className?: string;
  layout?: 'full' | 'section';
  id: string;
}) {

  const wrapperClasses = layout === 'full' ? 'w-full max-w-[920px]' : 'flex xs:flex-row';

  return (
    <section id={id} className={`${wrapperClasses} gap-2.5 ${className}`} style={{scrollMarginTop: '56px'}}>
      {children}
    </section>
  )
}
