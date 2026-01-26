// Empty 9x16 grid for new levels in editor
export const DEFAULT_LEVEL = {
    nRows: 9,
    nCols: 16,
    grid: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "b...............",
    ],
    start: [8, 0],
    dir: "right",
};

export const levels = [
    {
        name: "Level 1",
        nRows: 7,
        nCols: 8,
        grid: [
            "......bB",
            ".....bb.",
            "....bb..",
            "...bb...",
            "..bb....",
            ".bb.....",
            "bb......"
        ],
        start: [6, 0],
        dir: "right"
    },
    {
        name: "Level 2",
        nRows: 1,
        nCols: 11,
        grid: [
            "BbbbbbbbbbR"
        ],
        start: [0, 5],
        dir: "right"
    },
    {
        name: "Level 2T",
        nRows: 11,
        nCols: 1,
        grid: [
            "B",
            "b",
            "b",
            "b",
            "b",
            "b",
            "b",
            "b",
            "b",
            "b",
            "R"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T2",
        nRows: 11,
        nCols: 2,
        grid: [
            "BB",
            "bb",
            "bb",
            "bb",
            "bb",
            "bb",
            "bb",
            "bb",
            "bb",
            "bb",
            "RR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T3",
        nRows: 11,
        nCols: 3,
        grid: [
            "BBB",
            "bbb",
            "bbb",
            "bbb",
            "bbb",
            "bbb",
            "bbb",
            "bbb",
            "bbb",
            "bbb",
            "RRR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T4",
        nRows: 11,
        nCols: 4,
        grid: [
            "BBBB",
            "bbbb",
            "bbbb",
            "bbbb",
            "bbbb",
            "bbbb",
            "bbbb",
            "bbbb",
            "bbbb",
            "bbbb",
            "RRRR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T5",
        nRows: 11,
        nCols: 5,
        grid: [
            "BBBBB",
            "bbbbb",
            "bbbbb",
            "bbbbb",
            "bbbbb",
            "bbbbb",
            "bbbbb",
            "bbbbb",
            "bbbbb",
            "bbbbb",
            "RRRRR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T6",
        nRows: 11,
        nCols: 6,
        grid: [
            "BBBBBB",
            "bbbbbb",
            "bbbbbb",
            "bbbbbb",
            "bbbbbb",
            "bbbbbb",
            "bbbbbb",
            "bbbbbb",
            "bbbbbb",
            "bbbbbb",
            "RRRRRR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T7",
        nRows: 11,
        nCols: 7,
        grid: [
            "BBBBBBB",
            "bbbbbbb",
            "bbbbbbb",
            "bbbbbbb",
            "bbbbbbb",
            "bbbbbbb",
            "bbbbbbb",
            "bbbbbbb",
            "bbbbbbb",
            "bbbbbbb",
            "RRRRRRR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T8",
        nRows: 11,
        nCols: 8,
        grid: [
            "BBBBBBBB",
            "bbbbbbbb",
            "bbbbbbbb",
            "bbbbbbbb",
            "bbbbbbbb",
            "bbbbbbbb",
            "bbbbbbbb",
            "bbbbbbbb",
            "bbbbbbbb",
            "bbbbbbbb",
            "RRRRRRRR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T9",
        nRows: 11,
        nCols: 9,
        grid: [
            "BBBBBBBBB",
            "bbbbbbbbb",
            "bbbbbbbbb",
            "bbbbbbbbb",
            "bbbbbbbbb",
            "bbbbbbbbb",
            "bbbbbbbbb",
            "bbbbbbbbb",
            "bbbbbbbbb",
            "bbbbbbbbb",
            "RRRRRRRRR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 2T10",
        nRows: 11,
        nCols: 10,
        grid: [
            "BBBBBBBBBB",
            "bbbbbbbbbb",
            "bbbbbbbbbb",
            "bbbbbbbbbb",
            "bbbbbbbbbb",
            "bbbbbbbbbb",
            "bbbbbbbbbb",
            "bbbbbbbbbb",
            "bbbbbbbbbb",
            "bbbbbbbbbb",
            "RRRRRRRRRR"
        ],
        start: [5, 0],
        dir: "down"
    },
    {
        name: "Level 3",
        nRows: 7,
        nCols: 8,
        grid: [
            "GbbbG.Gb",
            "b...b.b.",
            "b...b.b.",
            "b...b.b.",
            "GbR.b.b.",
            "..b.b.b.",
            "bbR.RbR."
        ],
        start: [6, 0],
        dir: "right"
    },
    {
        name: "Level 4",
        nRows: 6,
        nCols: 10,
        grid: [
            "rrrrrrrrrr",
            "BbBbBbBbbb",
            "bBbBbBbBbb",
            "bbBbBbBbBb",
            "bbbBbBbBbB",
            "gggggggggg"
        ],
        start: [5, 0],
        dir: "right"
    },
    {
        name: "Level 5",
        nRows: 7,
        nCols: 10,
        grid: [
            "GbbbGG..GB",
            "G....b..G.",
            "b....b..b.",
            "b....G..G.",
            "GGbR.b..R.",
            "...G.G..b.",
            "bbGR.RbGR."
        ],
        start: [6, 0],
        dir: "right"
    },
    {
        name: "Level 6",
        nRows: 7,
        nCols: 10,
        grid: [
            "GRbbRG..GB",
            "R....R..R.",
            "b....b..b.",
            "R....G..G.",
            "GRbR.b..G.",
            "...G.G..b.",
            "bbGR.RbGR."
        ],
        start: [6, 0],
        dir: "right"
    },
    {
        name: "Level 7",
        nRows: 5,
        nCols: 8,
        grid: [
            "bR......",
            ".b......",
            ".bbR..RB",
            "...b..b.",
            "...bbbb."
        ],
        start: [0, 0],
        dir: "right"
    },
    {
        name: "Level 8",
        nRows: 8,
        nCols: 8,
        grid: [
            "....G...",
            ".RbrbbR.",
            ".b.bb.b.",
            "GbbbbbR.",
            ".rbbbbbG",
            ".b.bb.b.",
            ".RbbrbR.",
            "...G...."
        ],
        start: [4, 3],
        dir: "right"
    },
    {
        name: "Counter Level 1.1",
        nRows: 4,
        nCols: 9,
        grid: [
            "bbbR.....",
            "...b.....",
            "...b.....",
            "...bBbbbB"
        ],
        start: [0, 0],
        dir: "right"
    },
    {
        name: "Counter Level 1.2",
        nRows: 6,
        nCols: 11,
        grid: [
            "bbbbbR.....",
            ".....b.....",
            ".....b.....",
            ".....b.....",
            ".....b.....",
            ".....bbbbBb"
        ],
        start: [0, 0],
        dir: "right"
    },
    {
        name: "Counter Level 1.3",
        nRows: 3,
        nCols: 4,
        grid: [
            "bbR.",
            "..b.",
            "..bB"
        ],
        start: [0, 0],
        dir: "right"
    },
    {
        name: "Counter Level 2",
        nRows: 9,
        nCols: 13,
        grid: [
            "bbbbR........",
            "....b........",
            "....b........",
            "....bbR......",
            "......b......",
            "......bbbR...",
            ".........b...",
            ".........b...",
            ".........bbbB"
        ],
        start: [0, 0],
        dir: "right"
    },
    {
        name: "Counter Level 3",
        nRows: 7,
        nCols: 11,
        grid: [
            "R..R.......",
            "B..B.R.R...",
            "B..B.B.BR..",
            "BR.B.BRBB..",
            "BB.BRBBBBR.",
            "BBRBBBBBBBR",
            "bBBBBBBBBBB"
        ],
        start: [6, 0],
        dir: "right"
    },
    {
        name: "Counter Level 4",
        nRows: 7,
        nCols: 8,
        grid: [
            "RbbbR.RB",
            "b...b.b.",
            "b...b.b.",
            "b...G.G.",
            "RGR.b.b.",
            "..b.b.b.",
            "bbR.RbR."
        ],
        start: [6, 0],
        dir: "right"
    }
];
