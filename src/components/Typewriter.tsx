import { useEffect, useState } from 'react';

interface Props {
  text: string;
  instant?: boolean;
  cps?: number;
}

export function Typewriter({ text, instant = false, cps = 40 }: Props) {
  const [displayedLength, setDisplayedLength] = useState(instant ? text.length : 0);

  useEffect(() => {
    if (instant) {
      setDisplayedLength(text.length);
      return;
    }

    setDisplayedLength(0);
    let i = 0;
    const intervalId = window.setInterval(() => {
      i += 1;
      setDisplayedLength(i);
      if (i >= text.length) {
        window.clearInterval(intervalId);
      }
    }, 1000 / cps);

    return () => window.clearInterval(intervalId);
  }, [text, instant, cps]);

  return <span className="whitespace-pre-wrap">{text.slice(0, displayedLength)}</span>;
}
