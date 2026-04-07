import type { ViewPlaybookExample } from "../../../../runtime/view/manifest";
import { openThenDescribeExample } from "./openThenDescribe";
import { sessionAddTwoObjectsAndMoveOneExample } from "./sessionAddTwoObjectsAndMoveOne";
import { sessionDrawCircleAndRadiusExample } from "./sessionDrawCircleAndRadius";
import { sessionGeometrySolutionStepsWithAngleMarkerExample } from "./sessionGeometrySolutionStepsWithAngleMarker";
import { sessionDrawPolygonAndFocusVertexExample } from "./sessionDrawPolygonAndFocusVertex";
import { sessionEmphasizeFormulaWithStyleAndLabelExample } from "./sessionEmphasizeFormulaWithStyleAndLabel";

export const coordinatePlaneMainExamples: ViewPlaybookExample[] = [
  openThenDescribeExample,
  sessionDrawCircleAndRadiusExample,
  sessionGeometrySolutionStepsWithAngleMarkerExample,
  sessionAddTwoObjectsAndMoveOneExample,
  sessionDrawPolygonAndFocusVertexExample,
  sessionEmphasizeFormulaWithStyleAndLabelExample,
];

export const coordinatePlaneMainExampleNames = coordinatePlaneMainExamples.map((example) => example.name);
