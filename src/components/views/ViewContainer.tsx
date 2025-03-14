"use client";

import { View } from '../../lib/types';
import GalleryView from './GalleryView';
import BoardView from './BoardView';
import TableView from './TableView';
import { logger } from '../../lib/utils';

interface ViewContainerProps {
  view: View;
}

export default function ViewContainer({ view }: ViewContainerProps) {
  logger.info('Rendering view', { name: view.name, style: view.style });
  
  // Render the appropriate view based on the style
  switch (view.style) {
    case 'gallery':
      return <GalleryView view={view} />;
    case 'board':
      return <BoardView view={view} />;
    case 'table':
      return <TableView view={view} />;
    default:
      logger.error('Unknown view style', { style: view.style });
      return (
        <div className="p-4 text-gray-500">
          Unknown view style: {view.style}
        </div>
      );
  }
}
