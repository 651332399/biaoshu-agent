import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun } from 'docx';
import type { Scenario, DocBlockData } from '../engine/types';

function blockToChildren(block: DocBlockData): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [
    new Paragraph({
      text: block.标题,
      heading: HeadingLevel.HEADING_2,
    }),
  ];

  if (block.render === 'prose' && block.prose) {
    out.push(
      new Paragraph({
        children: [new TextRun(block.prose)],
      })
    );
  }

  if (block.render === 'table' && block.table) {
    const rows = [block.table.headers, ...block.table.rows].map(
      (cells) =>
        new TableRow({
          children: cells.map(
            (c) =>
              new TableCell({
                children: [new Paragraph(c)],
              })
          ),
        })
    );
    out.push(new Table({ rows }));
  }

  if (block.render === 'form' && block.form) {
    block.form.forEach((f) => {
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${f.label}：`, bold: true }),
            new TextRun(f.value),
          ],
        })
      );
    });
  }

  if (block.render === 'attachment' && block.attachment) {
    out.push(
      new Paragraph({
        children: [new TextRun(`【附件扫描件】${block.attachment.名称}`)],
      })
    );
  }

  return out;
}

export async function buildDocx(scenario: Scenario): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: scenario.meta.项目名,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({ text: '' }), // Spacer
  ];

  for (const vol of scenario.volumes) {
    children.push(
      new Paragraph({
        text: `【分册】${vol.名称}${vol.单独密封 ? ' (★ 独立盖章密封)' : ''}`,
        heading: HeadingLevel.HEADING_1,
      })
    );
    children.push(new Paragraph({ text: '' })); // Spacer

    const volBlocks = scenario.blocks.filter((b) =>
      vol.chapters.some((c) => c.id === b.chapterId)
    );

    volBlocks.forEach((b) => {
      blockToChildren(b).forEach((x) => {
        children.push(x);
        children.push(new Paragraph({ text: '' })); // Spacer
      });
    });
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
