import React, { useEffect, useState, createContext } from 'react';
import { TextField, Button, imageListItemBarClasses } from '@mui/material';
import './css/Rooms.css';
import Board from './Board';
import GameVersus from './GameVersus';
import TitleText from './TitleText';
import io from 'socket.io-client';
import { BoardAttributes, CellAttributes } from './Helpers';
import {
  boardState,
  roomInfoState,
  RoomInfo,
  clearFlagsState,
} from '../recoil_state';
import { useRecoilState } from 'recoil';
import { isValidCoords, unCoverFirstTile, unCoverTile } from './BoardHelpers';

const socket = io(import.meta.env.VITE_BE_URL, { autoConnect: false });

const Rooms = () => {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [roomInfo, setRoomInfo] = useRecoilState(roomInfoState);
  const [startGame, setStartGame] = useState<boolean>(false);
  const [firstMove, setFirstMove] = useState<boolean>(true);
  const [clearFlags, setClearFlags] = useRecoilState(clearFlagsState);
  const [board, setBoard] = useRecoilState(boardState);
  const [boards, setBoards] = useState<Record<string, CellAttributes[][]>>({});

  useEffect(() => {
    socket.on('connect', () => {
      console.log('hi');
      setIsConnected(true);
    });

    socket.on('game-reconnect', () => {
      setFirstMove(false);
    });

    socket.on('disconnect', () => {
      console.log('bye :(');
      setIsConnected(false);
    });

    socket.on('error', (message: string) => {
      socket.disconnect();
      console.log('ERROR: ' + message);
    });

    socket.on('boards', (boards, sender) => {
      boards = JSON.parse(boards);
      console.log(boards[roomInfo.username]);
      console.log(sender);
      if (sender === roomInfo.username) {
        setBoard(boards[roomInfo.username]);
      }
      setBoards(boards);
    });

    socket.on('game', (condition) => {
      console.log('game', condition);
      if (condition === 'lost') {
        console.log('GAME LOST');
        return;
      }
      if (condition === 'bomb') {
        setFirstMove(true);
        setClearFlags((clearFlags + 1) % 2);
      }
      if (condition === 'win') {
        console.log('GAME WON');
        socket.disconnect();
        return;
      }
      return;
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off('boards');
      socket.off('game');
    };
  }, [roomInfo.roomName, roomInfo.username, board]);

  const addRoom = async (e: React.MouseEvent) => {
    e.preventDefault();
    setFirstMove(true);
    socket.auth = { username: roomInfo.username };
    socket.connect();
    socket.emit('room:create', roomInfo.roomName);
    return;
  };

  const joinRoom = (e: React.MouseEvent) => {
    e.preventDefault();
    setFirstMove(true);
    socket.auth = { username: roomInfo.username };
    socket.connect();
    socket.emit('room:join', roomInfo.roomName);
    return;
  };

  const revealTile = (x: number, y: number) => {
    console.log('revealing tile', x, y);
    socket.emit(
      'game:revealTile',
      x.toString(),
      y.toString(),
      roomInfo.roomName,
      firstMove
    );
    if (firstMove === true) {
      setFirstMove(false);
    }
  };

  const revealTileLocal = (x: number, y: number) => {
    if (board[x][y].value === -1) {
      setFirstMove(true);
      setClearFlags((clearFlags + 1) % 2);
    }
    let newBoard = JSON.parse(JSON.stringify(board));
    if (firstMove) {
      newBoard = unCoverFirstTile(newBoard, x, y);
      setFirstMove(false);
    } else {
      newBoard = unCoverTile(newBoard, x, y);
    }
    setBoard(newBoard);
    socket.emit('game:pushBoard', roomInfo.roomName, newBoard);
  };

  const handleRoomNameField = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRoomInfo({ ...roomInfo, roomName: event.target.value });
  };

  const handleUsernameField = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRoomInfo({ ...roomInfo, username: event.target.value });
  };

  return (
    <div>
      {isConnected === false ? (
        <>
          <h4>Oursweeper</h4>
          <p>Connected: {'' + isConnected}</p>
          <TextField
            label={'Room name'}
            value={roomInfo.roomName}
            onChange={handleRoomNameField}
          />
          <TextField
            label={'Username'}
            value={roomInfo.username}
            onChange={handleUsernameField}
            sx={{ marginLeft: '1rem' }}
          />
          {roomInfo.roomName !== '' && roomInfo.username !== '' ? (
            <>
              {' '}
              <Button
                variant="contained"
                sx={{ marginLeft: '1rem' }}
                onClick={addRoom}
              >
                Create Game
              </Button>
              <Button
                variant="contained"
                sx={{ marginLeft: '1rem' }}
                onClick={joinRoom}
              >
                Join Game
              </Button>
            </>
          ) : (
            <>
              {' '}
              <Button disabled variant="contained" sx={{ marginLeft: '1rem' }}>
                Create Game
              </Button>
              <Button disabled variant="contained" sx={{ marginLeft: '1rem' }}>
                Join Game
              </Button>
            </>
          )}
        </>
      ) : (
        <GameVersus
          difficulty={0}
          revealTile={revealTileLocal}
          boards={boards}
        />
      )}
    </div>
  );
};

export default Rooms;
