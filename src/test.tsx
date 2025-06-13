import React, { useState, useMemo, useRef, useEffect } from 'react';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject { [key: string]: JsonValue }

interface RecursivePanelProps {
  data: JsonObject;
}

const RecursivePanel: React.FC<RecursivePanelProps> = ({ data }) => {
  const [path, setPath] = useState<string[]>([]);
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLevels = useMemo(() => {
    const levels: JsonValue[] = [];
    let current: JsonValue = data;
    levels.push(current);

    for (let key of path) {
      if (typeof current === 'object' && current !== null && key in current) {
        current = (current as JsonObject)[key];
        levels.push(current);
      } else {
        break;
      }
    }
    return levels;
  }, [path, data]);

  const visiblePanels = currentLevels.slice(-3);

  const handleKeyClick = (levelIndex: number, key: string) => {
    if (animating) return; // 중복 클릭 방지
    const newPath = path.slice(0, levelIndex).concat(key);
    setAnimating(true);
    setPath(newPath);
  };

  useEffect(() => {
    const timer = setTimeout(() => setAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [path]);

  const getFlex = (index: number) => {
    return index === 2 ? 'flex-[2_2_0%]' : 'flex-[1_1_0%]';
  };

  return (
    <div
      ref={containerRef}
      className={`flex w-full h-screen overflow-hidden transition-transform duration-300 ease-in-out`}
      style={{
        transform: `translateX(-${Math.max(currentLevels.length - 3, 0) * 100}%)`,
      }}
    >
      {currentLevels.map((panelData, globalLevel) => {
        const index = globalLevel >= currentLevels.length - 3
          ? globalLevel - (currentLevels.length - 3)
          : null;

        if (index === null) return null;

        return (
          <div
            key={globalLevel}
            className={`border border-gray-300 p-2 overflow-y-auto ${getFlex(index)} shrink-0 grow-0 basis-0 transition-all duration-300`}
          >
            {typeof panelData === 'object' && panelData !== null
              ? Object.entries(panelData as JsonObject).map(([key]) => (
                  <div
                    key={key}
                    onClick={() => handleKeyClick(globalLevel, key)}
                    className="cursor-pointer truncate p-2 border-b border-gray-200 hover:bg-gray-100"
                    title={key}
                  >
                    {key}
                  </div>
                ))
              : <div className="font-bold">{String(panelData)}</div>}
          </div>
        );
      })}
    </div>
  );
};

export default RecursivePanel;
