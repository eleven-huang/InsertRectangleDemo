import React, {useRef, useEffect, useState} from 'react'
import {MIN_WIDTH, MIN_HEIGHT, MAX_S, SPACE, CANVAS_HEIGHT, CANVAS_WIDTH, TOP, BOTTOM, LEFT, RIGHT, CENTER, DEFAULT_S, FIT_BOX_COLOR, SPACE_BOX_COLOR, SPACE_BOX_BG_COLOR} from './constants'

type Box = {
  x: number,
  y: number,
  width: number,
  height: number
}

type Pointer = {
  x: number,
  y: number,
}

type FitBoxDetail = {
  index: number,
  position: number
}

type FitDistance = {
  distance: number,
  position: number
}

const InsertRectangleDemo: React.FunctionComponent = (): JSX.Element => {
  const canvasRef = useRef(null);
  const boxes: Box[] = [];
  const spaceBoxes: Box[] = [{
    x: 0,
    y: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT
  }]

  const [enableClick, setEnableClick] = useState<boolean>(true);

  useEffect(() => {
    const canvas: any = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
    }
  }, [])

  const insertBoxForTarget = (event: any): void => {
    setEnableClick(false);

    const target: Pointer = pointerForEvent(event);
    const newBox: Box = createNewBox();

    const fit_box_detail: FitBoxDetail | null = findNearestFitBoxForTarget(target, newBox, spaceBoxes);
    if (fit_box_detail) {
      const fit_box = spaceBoxes[fit_box_detail.index];
      const position = getPositionForTargetBox(target, newBox, fit_box_detail, fit_box);

      [newBox.x, newBox.y] = [position.x, position.y];
      boxes.push(newBox);
      clippingInspectBoxesForNewBox(newBox, spaceBoxes);

      //draw
      const canvas: any = canvasRef.current;
      clearCanvas(canvas);
      drawBoxes(canvas, spaceBoxes, SPACE_BOX_COLOR, SPACE_BOX_BG_COLOR);
      drawBoxes(canvas, boxes, FIT_BOX_COLOR, FIT_BOX_COLOR);
    }

    setEnableClick(true);
  }

  const insertNothing = (e: any): void => {

  }

  return (
    <>
      <div className="info">点击画布任意位置插入新矩形，新矩形的边长在{MIN_WIDTH}~{MAX_S}px之间随机产生</div>
      <canvas id="canvas" ref={canvasRef} onClick={enableClick? insertBoxForTarget : insertNothing}></canvas>
    </>
  )
}

function createNewBox(): Box {
    return {
      x: -1,
      y: -1,
      width: getRndInteger(MIN_WIDTH, MAX_S),
      height: getRndInteger(MIN_HEIGHT, MAX_S)
    }
}

function pointerForEvent(event: any): Pointer {
  return {
    x: event.clientX,
    y: event.clientY
  }
}

function clippingInspectBoxesForNewBox(newBox: Box, spaceBoxes: Box[]): void {
  const inspectBoxes: Box[] = getAndRemoveInsepectBoxesFor(newBox, spaceBoxes);

  inspectBoxes.forEach((box: Box) => {
    const clippedBoxes: Box[] = clippingBox(box, newBox);
    clippedBoxes.forEach((spaceBox: Box) => {
      addSpaceBox(spaceBox, spaceBoxes);
    })
  })
}

function drawBoxes(canvas: any, boxes: Box[], border_color: string, background_color: string | null) {
  const ctx = canvas.getContext("2d");
  boxes.forEach((box: Box) => {
    ctx.fillStyle = border_color;

    ctx.fillRect(box.x, box.y, box.width, 1);
    ctx.fillRect(box.x, box.y, 1, box.height);
    ctx.fillRect(box.x + box.width - 1, box.y, 1, box.height);
    ctx.fillRect(box.x, box.y + box.height - 1, box.width, 1);

    if (background_color) {
      ctx.fillStyle = background_color;
      ctx.fillRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);
    }
  });
}

function clearCanvas(canvas: any): void {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function clippingBox(spaceBox: Box, insertBox: Box): Box[] {
  const boxes: Box[] = [];
  //clipping left
  if(insertBox.x - spaceBox.x - SPACE >= MIN_WIDTH) {
    boxes.push({
      x: spaceBox.x,
      y: spaceBox.y,
      width: insertBox.x - spaceBox.x - SPACE,
      height: spaceBox.height
    })
  }

  //clipping top
  if(insertBox.y - spaceBox.y - SPACE >= MIN_HEIGHT) {
    boxes.push({
      x: spaceBox.x,
      y: spaceBox.y,
      width: spaceBox.width,
      height: insertBox.y - spaceBox.y - SPACE
    })
  }

  //clipping right
  if ((spaceBox.x + spaceBox.width) - (insertBox.x + insertBox.width + SPACE) >= SPACE + MIN_WIDTH) {
    boxes.push({
      x: insertBox.x + insertBox.width + SPACE,
      y: spaceBox.y,
      width: (spaceBox.x + spaceBox.width) - (insertBox.x + insertBox.width + SPACE),
      height: spaceBox.height
    })
  }

  //clipping bottom
  if((spaceBox.y + spaceBox.height) - (insertBox.y + insertBox.height + SPACE) >= SPACE + MIN_HEIGHT) {
    boxes.push({
      x: spaceBox.x,
      y: insertBox.y + insertBox.height + SPACE,
      width: spaceBox.width,
      height: (spaceBox.y + spaceBox.height) - (insertBox.y + insertBox.height + SPACE),
    })
  }

  return boxes;
}

function findNearestFitBoxForTarget(target: Pointer, insertBox: Box, spaceBoxes: Box[]): FitBoxDetail | null {
  let box_index: number = -1;
  let min_distance: number = Infinity;
  let position = CENTER;

  spaceBoxes.forEach((box: Box, index: number) => {
    if(box.width >= insertBox.width && box.height >= insertBox.height) {
      const fit_distance: FitDistance = boxDistanceToTarget(box, target);

      if (min_distance > fit_distance.distance) {
        min_distance = fit_distance.distance;

        position = fit_distance.position;
        box_index = index;
      }
    }
  })

  if (box_index >= 0) return {
    index: box_index,
    position: position
  };

  return null;
}

function addSpaceBox(box: Box, spaceBoxes: Box[]): void {
  let invalid: boolean = false;
  //invalid size
  if (box.width < MIN_WIDTH || box.height < MIN_HEIGHT) return;

  //wether box is same or inside another box
  spaceBoxes.forEach((spaceBox: Box) => {
    if (box.x >= spaceBox.x && box.x + box.width <= spaceBox.x + spaceBox.width &&
        box.y >= spaceBox.y && box.y + box.height <= spaceBox.y + spaceBox.height) {
          invalid = true;
          return;
    }
  });

  if (invalid) return;

  let canJoin: boolean = false;
  //check wehter it can be joined with another box
  for(let i = 0; i < spaceBoxes.length; i ++) {
    const spaceBox = spaceBoxes[i];
    //inspect in the same column
    if (box.x === spaceBox.x && box.width === spaceBox.width &&
        !(box.y > spaceBox.y + spaceBox.height || box.y + box.height < spaceBox.y)) {
        canJoin = true;
        const y: number = Math.min(spaceBox.y, box.y);
        const height: number = Math.max(spaceBox.y + spaceBox.height, box.y + box.height);
        spaceBox.y = y;
        spaceBox.height = height - y;
        break;
    }

    //inspect in the same row
    if(box.y === spaceBox.y && box.height === spaceBox.height &&
        !(box.x > spaceBox.x + spaceBox.width || box.x + box.width < spaceBox.x)) {
          canJoin = true;
          const x: number = Math.min(box.x, spaceBox.x);
          const width: number = Math.max(spaceBox.x + spaceBox.width, box.x + box.width);
          spaceBox.x = x;
          spaceBox.width = width - x;
          break;
    }
  }

  if (!canJoin) spaceBoxes.push({...box});
}

function getAndRemoveInsepectBoxesFor(box: Box, spaceBoxes: Box[]): Box[] {
  const inspect_boxes: Box[] = [];
  for(let i = 0; i < spaceBoxes.length; i++) {
    const spaceBox = spaceBoxes[i];
    //inspect
    if (!(spaceBox.x > box.x + box.width + SPACE || spaceBox.x + spaceBox.width < box.x - SPACE ||
    spaceBox.y > box.y + box.height + SPACE || spaceBox.y + spaceBox.height < box.y - SPACE)) {
      spaceBoxes.splice(i--, 1);
      inspect_boxes.push({...spaceBox});
    }
  }

  return inspect_boxes;
}

function boxDistanceToTarget(box: Box, target: Pointer): FitDistance {

  //box below target
  if (box.y > target.y) {
    if (box.x > target.x) return {
      distance: distanceBetweenTwoPointers({x: box.x, y: box.y}, target),
      position: TOP
    }

    if (box.x + box.width < target.x) return {
      distance: distanceBetweenTwoPointers({x: box.x + box.width, y: box.y}, target),
      position: TOP
    }

    return {
      distance: box.y - target.y,
      position: TOP
    }
  }

  //box above target
  if ((box.y + box.height) <= target.y) {
    if (box.x > target.x) return {
      distance: distanceBetweenTwoPointers({x: box.x, y: box.y + box.height}, target),
      position: BOTTOM
    }

    if (box.x + box.width < target.x) return {
      distance: distanceBetweenTwoPointers({x: box.x + box.width, y: box.y + box.height}, target),
      position: BOTTOM
    }

    return {
      distance: target.y - box.y,
      position: BOTTOM
    }
  }

  //box right to target
  if (box.x > target.x) {
    return {
      distance: box.x - target.x,
      position: LEFT
    }
  }

  //box left to target
  if ((box.x + box.width) < target.x) {
    return {
      distance: target.x - box.x - box.width,
      position: RIGHT
    };
  }

  // target in box
  return {
    distance: 0,
    position: CENTER
  };
}

function miniDistanceBetweenTwoPointersFromTarget(pointer1: Pointer, pointer2: Pointer, target: Pointer): number {
  const distance1 = distanceBetweenTwoPointers(pointer1, target);
  const distance2 = distanceBetweenTwoPointers(pointer2, target);

  return distance1 > distance2? distance1 : distance2;
}


function distanceBetweenTwoPointers(pointer1: Pointer, pointer2: Pointer): number {
  let distance = -1;

  const width = Math.abs(pointer1.x - pointer2.x);
  const height = Math.abs(pointer1.y - pointer2.y);

  return Math.sqrt(width*width + height*height);
}

function getPositionForTargetBox(target: Pointer, insertBox: Box, fitBoxDetail: FitBoxDetail, fitBox: Box): Pointer {
  const position = fitBoxDetail.position;
  switch (fitBoxDetail.position) {
    case TOP:
      return getPositionForTargetInTop(target, insertBox, fitBoxDetail, fitBox);
      break;
    case BOTTOM:
      return getPositionForTargetInBottom(target, insertBox, fitBoxDetail, fitBox);
      break;
    case LEFT:
      return getPositionForTargetInLeft(target, insertBox, fitBoxDetail, fitBox);
      break;
    case RIGHT:
      return getPositionForTargetInRight(target, insertBox, fitBoxDetail, fitBox);
      break;
    default:
      //CENTER
      return getPositionFroTaretBoxInCenter(target, insertBox, fitBoxDetail, fitBox);
      break;
  }
}

function getPositionForTargetInTop(target: Pointer, insertBox: Box, fitBoxDetail: FitBoxDetail, fitBox: Box): Pointer {
  const y = fitBox.y;
  return getPositionForTargetInEitherUpOrDownWithY(target, insertBox, fitBoxDetail, fitBox, y);
}

function getPositionForTargetInBottom(target: Pointer, insertBox: Box, fitBoxDetail: FitBoxDetail, fitBox: Box): Pointer {
  const y = fitBox.y + fitBox.height - insertBox.height;
  return getPositionForTargetInEitherUpOrDownWithY(target, insertBox, fitBoxDetail, fitBox, y);
}

function getPositionForTargetInEitherUpOrDownWithY(target: Pointer, insertBox: Box, fitBoxDetail: FitBoxDetail, fitBox: Box, y: number): Pointer {

  //left
  if (target.x < fitBox.x || target.x - fitBox.x < insertBox.width/2.0) return {
    x: fitBox.x,
    y: y
  }

  //right
  if (fitBox.x + fitBox.width < target.x || (fitBox.x + fitBox.width) - target.x < insertBox.width/2.0) return {
    x: fitBox.x + fitBox.width - insertBox.width,
    y: y
  }

  //middle
  return {
    x: target.x - insertBox.width/2.0,
    y: y
  }
}

function getPositionForTargetInLeft(target: Pointer, insertBox: Box, fitBoxDetail: FitBoxDetail, fitBox: Box): Pointer {
  const x = fitBox.x;
  return getPositionForTargetOnEitherSideWithX(target, insertBox, fitBoxDetail, fitBox, x);
}

function getPositionForTargetInRight(target: Pointer, insertBox: Box, fitBoxDetail: FitBoxDetail, fitBox: Box): Pointer {
  const x = fitBox.x + fitBox.width - insertBox.width;
  return getPositionForTargetOnEitherSideWithX(target, insertBox, fitBoxDetail, fitBox, x);
}

function getPositionForTargetOnEitherSideWithX(target: Pointer, insertBox: Box, fitBoxDetail: FitBoxDetail, fitBox: Box, x: number): Pointer {
  //close to top
  if (target.y - fitBox.y < insertBox.height/2.0) return {
    x: x,
    y: fitBox.y
  }

  //close to bottom
  if (fitBox.y + fitBox.height - target.y < insertBox.height/2.0) return {
    x: x,
    y: fitBox.y + fitBox.height - insertBox.height
  }

  //middle
  return {
    x: x,
    y: target.y - insertBox.height/2.0
  }
}

function getPositionFroTaretBoxInCenter(target: Pointer, insertBox: Box, fitBoxDetail: FitBoxDetail, fitBox: Box): Pointer {
  let x = target.x - insertBox.width/2.0;
  let y = target.y - insertBox.height/2.0;

  //target near left
  if (target.x - fitBox.x < insertBox.width/2.0) {
    x = fitBox.x;
  }

  //target near right
  if (target.x - fitBox.x + insertBox.width/2.0 > fitBox.x + fitBox.width) {
    x = fitBox.x + fitBox.width - insertBox.width;
  }

  //close to top
  if (target.y - fitBox.y < insertBox.height/2.0) {
    y = fitBox.y;
  }

  //close to bottom
  if (target.y - insertBox.y + insertBox.height/2.0 > fitBox.y + fitBox.height) {
    y = fitBox.y + fitBox.height - insertBox.height;
  }

  return {x, y};
}

function getRndInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}

export default InsertRectangleDemo;
