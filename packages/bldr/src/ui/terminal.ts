import blessed from "blessed";

export interface TerminalUI {
  screen: blessed.Widgets.Screen;
  bldrBox: blessed.Widgets.BoxElement;
  tscBox: blessed.Widgets.BoxElement;
  aliasBox: blessed.Widgets.BoxElement;
  logToBldr: (text: string) => void;
  destroy: () => void;
}

export function createTerminalUI(onShutdown: () => void): TerminalUI {
  const screen = blessed.screen({
    smartCSR: true,
    title: "bldr - TypeScript Build Tool",
    fullUnicode: true,
  });

  // Common styles
  const boxStyle: any = {
    border: {
      fg: "cyan",
    },
  };

  // Left column: tsc (65% width, full height)
  const tscBox = blessed.box({
    top: 0,
    left: 0,
    width: "65%",
    height: "100%",
    label: " tsc ",
    border: { type: "line" },
    style: boxStyle,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: { bg: "grey" },
      style: { inverse: true },
    },
    tags: true, // Enable colors/formatting
  });

  // Right column: tsc-alias (top 50%) and bldr (bottom 50%), 35% width, full height
  const aliasBox = blessed.box({
    top: 0,
    left: "65%",
    width: "35%",
    height: "50%",
    label: " tsc alias ",
    border: { type: "line" },
    style: boxStyle,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: { bg: "grey" },
      style: { inverse: true },
    },
    tags: true,
  });

  const bldrBox = blessed.box({
    top: "50%",
    left: "65%",
    width: "35%",
    height: "50%",
    label: " bldr ",
    border: { type: "line" },
    style: boxStyle,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: { bg: "grey" },
      style: { inverse: true },
    },
    tags: true,
  });

  screen.append(tscBox);
  screen.append(aliasBox);
  screen.append(bldrBox);

  // Enable mouse events for scrolling
  screen.enableMouse();
  screen.enableKeys();

  // Handle screen events
  screen.key(["escape", "q", "C-c"], () => {
    onShutdown();
  });

  screen.key(["C-l"], () => {
    bldrBox.setScrollPerc(100);
    tscBox.setScrollPerc(100);
    aliasBox.setScrollPerc(100);
    screen.render();
  });

  // Handle mouse wheel scrolling for each box
  screen.on("mouse", (data: any) => {
    // Determine which box the mouse is over
    const x = data.x;
    const y = data.y;

    const width = screen.width as number;
    const height = screen.height as number;
    const tscWidth = Math.floor(width * 0.65);
    const midHeight = Math.floor(height * 0.5);

    let targetBox: blessed.Widgets.BoxElement | null = null;

    if (x < tscWidth) {
      targetBox = tscBox;
    } else {
      if (y < midHeight) {
        targetBox = aliasBox;
      } else {
        targetBox = bldrBox;
      }
    }

    if (!targetBox) return;

    if (data.action === "wheelup") {
      targetBox.scroll(-3);
      screen.render();
    } else if (data.action === "wheeldown") {
      targetBox.scroll(3);
      screen.render();
    }
  });

  const logToBldr = (text: string) => {
    if (bldrBox) {
      // Trim empty lines but keep content
      const lines = text.split("\n").filter((l) => l.trim().length > 0 || l === "");
      lines.forEach((line) => bldrBox.insertBottom(line));
      bldrBox.setScrollPerc(100);
      screen.render();
    }
  };

  const destroy = () => {
    screen.destroy();
  };

  screen.render();

  return { screen, bldrBox, tscBox, aliasBox, logToBldr, destroy };
}
