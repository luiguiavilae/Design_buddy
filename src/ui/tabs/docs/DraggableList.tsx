import { useRef, useState } from 'react'

interface DraggableListProps<T> {
  items: T[]
  onReorder: (from: number, to: number) => void
  renderItem: (item: T, index: number, dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
}

export function DraggableList<T>({ items, onReorder, renderItem, keyExtractor }: DraggableListProps<T>) {
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => { dragIndex.current = index }
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setOverIndex(index) }
  const handleDrop = (index: number) => {
    if (dragIndex.current !== null && dragIndex.current !== index) {
      onReorder(dragIndex.current, index)
    }
    dragIndex.current = null
    setOverIndex(null)
  }
  const handleDragEnd = () => { dragIndex.current = null; setOverIndex(null) }

  return (
    <div>
      {items.map((item, index) => {
        const dragHandleProps: React.HTMLAttributes<HTMLElement> = {
          draggable: true,
          onDragStart: () => handleDragStart(index),
          onDragOver: (e) => handleDragOver(e as React.DragEvent, index),
          onDrop: () => handleDrop(index),
          onDragEnd: handleDragEnd,
        }
        return (
          <div key={keyExtractor(item, index)} style={{ opacity: overIndex === index ? 0.5 : 1, transition: 'opacity 0.15s' }}>
            {renderItem(item, index, dragHandleProps)}
          </div>
        )
      })}
    </div>
  )
}
