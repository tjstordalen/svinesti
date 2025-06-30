//function load_default_levels(){
//	return fetch('./default_levels.json')
//		.then((response) => response.json())
//		.then((json) => json);
//}


function load_default_levels() {
	return [
	  {
	    "level": "......bB\n.....bb.\n....bb..\n...bb...\n..bb....\n.bb.....\nbb......",
	    "x0": 0,
	    "y0": 0,
	    "dir": "r"
	  },
	  {
	    "level": "rrrrrrrrrr\nBbBbBbBbbb\nbBbBbBbBbb\nbbBbBbBbBb\nbbbBbBbBbB\ngggggggggg",
	    "x0": 0,
	    "y0": 0,
	    "dir": "r"
	  },
	  {
	    "level": "....R\n....b\n....b\nBbbbG\n....b\n....b\n....B",
	    "x0": 0,
	    "y0": 3,
	    "dir": "r"
	  },
	  {
	    "level": "bbbR.....\n...b.....\n...b.....\n...bBbbbB",
	    "x0": 0,
	    "y0": 3,
	    "dir": "r"
	  },
	  {
	    "level": "bbbbR........\n....b........\n....b........\n....bbR......\n......b......\n......bbbR...\n.........b...\n.........b...\n.........bbbB",
	    "x0": 0,
	    "y0": 8,
	    "dir": "r"
	  },
	  {
	    "level": "R..R.......\nB..B.R.R...\nB..B.B.BR..\nBR.B.BRBB..\nBB.BRBBBBR.\nBBRBBBBBBBR\nbBBBBBBBBBB",
	    "x0": 0,
	    "y0": 0,
	    "dir": "r"
	  },
	  {
	    "level": "..GbbbbbbG\n..b......b\n..b......b\n..b..bbbbG\n..b.......\n..Grg.....\n...b......\nBbGb......",
	    "x0": 5,
	    "y0": 4,
	    "dir": "r"
	  },
	  {
	    "level": "....G...\n.RbrbbR.\n.b.bb.b.\nGbbbbbR.\n.rbbbbbG\n.b.bb.b.\n.RbbrbR.\n...G....",
	    "x0": 3,
	    "y0": 3,
	    "dir": "r"
	  }
	]
	}



function make_robot(x0, y0, dir = 0) {
    const robot = document.createElement("div");
    robot.id = "robot";
    robot.style.display = "flex";
    robot.style.justifyContent = "center";
    robot.style.alignItems = "center";

	const caret_container = document.createElement("div");
	caret_container.id = "caret-container"
	caret_container.innerHTML = caret_svg;

    // Insert the SVGs into the robot container
    robot.innerHTML = robot_svg;
	robot.appendChild(caret_container)

    return robot;
}






robot_svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-robot" viewBox="0 0 16 16">
  <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135"/>
  <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5"/>
</svg>`

caret_svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="caret bi bi-caret-right-fill" viewBox="0 0 16 16">
  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
</svg>`

