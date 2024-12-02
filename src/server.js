import http from "http";
import { Server } from "socket.io";
import express from "express";
import { count } from "console";

const app = express();
app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);
const httpServer = http.createServer(app);
const wsServer = new Server(httpServer);

const publicRooms = () => {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
};

const countRoom = (roomName) => {
  console.log(wsServer.sockets.adapter.rooms.get(roomName)?.size);
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
};
wsServer.on("connection", (socket) => {
  socket["nickname"] = "none";
  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName.payload); // 수정된 부분
    done();
    socket
      .to(roomName.payload)
      .emit("welcome", socket.nickname, countRoom(roomName.payload));
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
    );
  });
  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });

  socket.on("nickname", (nickname) => {
    socket["nickname"] = nickname;
  });
});

// const wss = new Websocket.Server({ server });
// const sockets = [];

// wss.on("connection", (socket) => {
//   sockets.push(socket);
//   socket.on("close", () => console.log("Connected to Server ❌"));
//   socket["nickname"] = "Anon";
//   socket.on("message", (msg) => {
//     const message = JSON.parse(msg.toString());
//     switch (message.type) {
//       case "new_message":
//         sockets.forEach((aSocket) =>
//           aSocket.send(`${socket.nickname}: ${message.payload}`)
//         );
//         break;
//       case "nickname":
//         socket["nickname"] = message.payload;
//         break;
//     }
//   });
// });

httpServer.listen(3000, handleListen);
