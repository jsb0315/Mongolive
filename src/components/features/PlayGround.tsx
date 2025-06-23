import React from "react";

const PlayGround = ({ data }: { data: any }) => {
  return (
    <div>
      <h1>PlayGround</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default PlayGround;
