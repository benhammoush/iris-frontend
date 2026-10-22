import { type ReactNode, type Ref } from 'react';

export default function CatalogPanel({
  title,
  tone,
  count,
  headingRef,
  id,
  children,
}: {
  title: string;
  tone: 'volume' | 'trending' | 'pools';
  count?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`iris-section iris-catalog-list iris-catalog-list--${tone}`}
      aria-labelledby={id}
    >
      <div className="iris-catalog-list-heading">
        <span aria-hidden="true" />
        <h2 id={id} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
          {title}
        </h2>
        {count && <small className="iris-catalog-list-count">{count}</small>}
      </div>
      {children}
    </section>
  );
}
