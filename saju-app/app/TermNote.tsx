// 용어 한 줄 풀이 — 카드 안 전문 용어 바로 아래에 붙인다. 서버·클라이언트 어디서든 쓸 수 있게 훅 없음.
import { GLOSSARY, GLOSSARY_LABEL, type GlossaryKey } from '@/lib/glossary';

export default function TermNote({ terms }: { terms: GlossaryKey[] }) {
  return (
    <dl className="term-note">
      {terms.map((k) => (
        <div key={k}>
          <dt>{GLOSSARY_LABEL[k] ?? k}</dt>
          <dd>{GLOSSARY[k]}</dd>
        </div>
      ))}
    </dl>
  );
}
