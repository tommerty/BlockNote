import {
  BlockNoteSchema,
  partialBlocksToBlocksForTesting,
} from "@blocknote/core";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import fs from "fs";
import { describe, it } from "vitest";
import { createDocxExporterForDefaultSchema } from "./docxExporter";
describe("exporter", () => {
  it("should export a document", async () => {
    const exporter = createDocxExporterForDefaultSchema();
    const ps = exporter.transform(
      partialBlocksToBlocksForTesting(BlockNoteSchema.create().blockSchema, [
        {
          type: "paragraph",
          content: "Welcome to this demo!",
        },
        {
          type: "paragraph",
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Blocks:",
              styles: { bold: true },
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph",
        },
        {
          type: "heading",
          content: "Heading",
        },
        {
          type: "paragraph",
          content: "Paragraph",
        },
        // {
        //   type: "bulletListItem",
        //   content: "Bullet List Item",
        // },
        // {
        //   type: "numberedListItem",
        //   content: "Numbered List Item",
        // },
        // {
        //   type: "checkListItem",
        //   content: "Check List Item",
        // },
        // {
        //   type: "table",
        //   content: {
        //     type: "tableContent",
        //     rows: [
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //     ],
        //   },
        // },
        // {
        //   type: "file",
        // },
        // {
        //   type: "image",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        //   },
        // },
        // {
        //   type: "video",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        //   },
        // },
        // {
        //   type: "audio",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        //   },
        // },
        // {
        //   type: "paragraph",
        // },
        // {
        //   type: "paragraph",
        //   content: [
        //     {
        //       type: "text",
        //       text: "Inline Content:",
        //       styles: { bold: true },
        //     },
        //   ],
        // },
        // {
        //   type: "paragraph",
        //   content: [
        //     {
        //       type: "text",
        //       text: "Styled Text",
        //       styles: {
        //         bold: true,
        //         italic: true,
        //         textColor: "red",
        //         backgroundColor: "blue",
        //       },
        //     },
        //     {
        //       type: "text",
        //       text: " ",
        //       styles: {},
        //     },
        //     {
        //       type: "link",
        //       content: "Link",
        //       href: "https://www.blocknotejs.org",
        //     },
        //   ],
        // },
        // {
        //   type: "paragraph",
        // },
      ])
    );
    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "blocknote-numbering",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1",
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {},
          children: ps,
        },
      ],
    });
    // console.log(JSON.stringify(ps, null, 2));

    const doc2 = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun("Hello World")],
            }),
            new Paragraph({
              children: [new TextRun("Heading")],
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [new TextRun("Goodbye")],
            }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc2);
    fs.writeFileSync(__dirname + "/My Document.docx", buffer);

    // await saveTestFile();
  });
});
