import * as React from "react";

import { fetchRoomData, fetchRoomList, remoteRoomCall } from "../services";

import { Card, Button, Typography, Autocomplete, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

import {
  Fab,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

const UPDATE_ROOM_LIST_INTERVAL = 5000;

interface IRoomListState {
  selected: Array<number>,
  rooms: Array<any>,
  rooms_schemas: Map<string, any>,
  connections: number,
  cpu: number,
  memory: {
    totalMemMb: number,
    usedMemMb: number
  },
  columns: Array<any>,
  find_options: {
    room_type: string | null,
    global_id: string
  }
}

export class RoomList extends React.Component {
  state: IRoomListState = {
    selected: [1],
    rooms: [],
    rooms_schemas: new Map<string,any>(),
    connections: 0,
    cpu: 0,
    memory: { totalMemMb: 0, usedMemMb: 0 },
    columns: [],
    find_options: {
      room_type: null,
      global_id: ""
    }
  };

  updateRoomListInterval: number;

  isSelected = (index) => {
    return this.state.selected.indexOf(index) !== -1;
  };

  componentWillMount() {
    this.fetchRoomList();
  }

  async fetchRoomList () {
    try {
      const new_room_data = new Map<string, any>();
      const data = await fetchRoomList();
      for(const room of data.body.rooms){
        if(this.state.find_options.global_id && this.state.find_options.room_type == room.name){
          const room_full_data = await fetchRoomData(room.roomId);
          new_room_data.set(room.roomId, room_full_data.body);
        }
      }
      this.setState(data.body);
      this.setState({
        rooms_schemas: new_room_data
      });
    } catch (err) {
      console.error(err)
    }

    clearInterval(this.updateRoomListInterval);

    this.updateRoomListInterval = window.setInterval(() =>
      this.fetchRoomList(), UPDATE_ROOM_LIST_INTERVAL);
  }

  handleRowSelection = (selectedRows) => {
    this.setState({
      selected: selectedRows,
    });
  };

  inspectRoom(roomId) {
    const history = (this.props as any).history;
    history.push('/room/' + roomId);
  }

  async disposeRoom(roomId) {
    await remoteRoomCall(roomId, "disconnect");
    this.fetchRoomList();
  }

  getColumnHeader(column) {
    return (typeof (column) === "string")
      ? column
      : column.metadata
  }

  getRoomColumn(room, column) {
    let field = column;
    let value: any;
    let valueFromObject: any = room;

    let postProcessValue: false | ((_: any) => string) = false;

    if (field === "elapsedTime") {
      postProcessValue = this.millisecondsToStr;

    } else if (column.metadata && room.metadata) {
      field = column.metadata;
      valueFromObject = room.metadata;
    }

    value = valueFromObject[field];

    if (value === undefined) {
      value = "";
    }

    return postProcessValue ? postProcessValue(value) : `${value}`;
  }

  millisecondsToStr(milliseconds) {
    let temp = Math.floor(milliseconds / 1000);

    const years = Math.floor(temp / 31536000);
    if (years) {
      return years + 'y';
    }

    const days = Math.floor((temp %= 31536000) / 86400);
    if (days) {
      return days + 'd';
    }

    const hours = Math.floor((temp %= 86400) / 3600);
    if (hours) {
      return hours + 'h';
    }

    const minutes = Math.floor((temp %= 3600) / 60);
    if (minutes) {
      return minutes + 'min';
    }

    const seconds = temp % 60;
    if (seconds) {
      return seconds + 's';
    }

    return 'less than a second';
  }

  bytesToStr(size: number) {
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return ((size / Math.pow(1024, i)).toFixed(2) as any) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  }

  getColumnsNames(columns: any): Array<any> {
    const data = columns.map(column => {
      const value = this.getColumnHeader(column);
      return { id: value, field: value, headerName: value, flex: 1 }
    });
    data.push({
      id: "Inspect",
      field: "Inspect",
      headerName: "Inspect",
      flex: 1,
      renderCell: (param) => {
        return <div style={{ cursor: "pointer" }} onClick={() => {
          this.inspectRoom(param.value);
        }}>
          <Button variant="contained" startIcon={<OpenInBrowserIcon />}>
            <Typography
              noWrap
              component="div"
              sx={{ flexGrow: 1, display: { xs: 'none', sm: 'none', md: "block" } }}
            >
              INSPECT
            </Typography>
          </Button>
        </div>
      }
    });
    data.push({
      id: "Dispose",
      field: "Dispose",
      headerName: "Dispose",
      flex: 1,
      renderCell: (param) => {
        return <div style={{ cursor: "pointer" }} onClick={() => {
          this.disposeRoom(param.value);
        }}>
          <Button variant="contained" color="error" startIcon={<DeleteForeverIcon />}>
            <Typography
              noWrap
              component="div"
              sx={{ flexGrow: 1, display: { xs: 'none', sm: 'none', md: "block" } }}
            >
              DISPOSE
            </Typography>
          </Button>
        </div>
      }
    });
    return data;
  }

  computeRowsData(rooms: Array<any>): Array<any> {
    const promise_total_data = rooms.map((room) => {
      if (this.state.find_options.room_type) {
        if (room.name != this.state.find_options.room_type) {
          return false;
        }
        if (this.state.find_options.global_id.length > 0) {
          const its_here = this.findGlobalIdInRoom(room);
          if(!its_here){
            return false;
          }
        }
      }

      const data = { id: room.roomId };
      for (const column of this.state.columns) {
        const value = this.getRoomColumn(room, column);
        data[column] = value;
      }
      data["Inspect"] = room.roomId;
      data["Dispose"] = room.roomId;
      return data
    });
    const data = promise_total_data.filter(element => element);
    return data;
  }

  findGlobalIdInRoom(room: any): boolean {
    const room_schema = this.state.rooms_schemas.get(room.roomId);
    if (!room_schema) {
      return false;
    }
    try {
      if (room_schema.state.players) {
        const data = Object.values(room_schema.state.players) as Array<any>;
        for (const player of data) {
          if (player.global_id == this.state.find_options.global_id) {
            return true;
          }
        }
      } else if (room_schema.state.entities) {
        for (const entity of room_schema.state.entities) {
          const string_keys = entity.attributes.string_keys as Array<string>;
          const string_values = entity.attributes.string_values as Array<string>;
          const index = string_keys.findIndex((value) => value == "global_client_id")
          if (string_values[index] == this.state.find_options.global_id) {
            return true;
          }
        };
      }
    } catch (err) {
      console.error(err);
      return true;
    }
    return false;
  }

  generateRoomListDataGrid(): JSX.Element {
    const all_filters = this.state.rooms.map(room => room.name);
    const available_filters = all_filters.filter((value,index) => all_filters.indexOf(value) === index);
    const columns = this.getColumnsNames(this.state.columns);
    const rows = this.computeRowsData(this.state.rooms);

    return <>
      {available_filters.length > 0 && <Card>
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="center" colSpan={2}>
                  <Autocomplete
                    disablePortal
                    id="combo-box-demo"
                    options={available_filters}
                    onChange={(event: any, new_value: string | null) => {
                      let global_id_value = this.state.find_options.global_id;
                      if(new_value == null){
                        global_id_value = "";
                      }
                      this.setState({
                        find_options: {
                          room_type: new_value,
                          global_id: global_id_value
                        }
                      });
                    }}
                    renderInput={(params) => <TextField {...params} label="Room type" />}
                  />
                </TableCell>
                <TableCell align="center" colSpan={2}>
                  <TextField
                    id="outlined-basic"
                    label="Global id"
                    variant="outlined"
                    disabled={this.state.find_options.room_type == null}
                    value={this.state.find_options.global_id}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      this.setState({
                        find_options: {
                          room_type: this.state.find_options.room_type,
                          global_id: event.target.value
                        }
                      });
                    }}
                  />
                </TableCell>
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>
      </Card>
      }
      <DataGrid
        columns={columns}
        rows={rows}
        autoHeight
        sx={{ overflow: "hidden" }}
        slots={{
          noRowsOverlay: () => <></>,
        }}
        loading={rows.length <= 0 && this.state.rooms.length > 0}
        disableRowSelectionOnClick
        hideFooter
        hideFooterPagination
        hideFooterSelectedRowCount
      />
    </>
  }

  render() {
    return (
      <div>
        <Card>
          <TableContainer component={Paper}>
            <Table aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell align={"center"}>
                    Connections
                    <Fab sx={{ marginLeft: "6px" }} variant="extended" size="small" color="primary" aria-label="add">
                      {this.state.connections}
                    </Fab>
                  </TableCell>
                  <TableCell align={"center"}>
                    Rooms
                    <Fab sx={{ marginLeft: "6px" }} variant="extended" size="small" color="primary" aria-label="add">
                      {this.state.rooms.length}
                    </Fab>
                  </TableCell>
                  <TableCell align={"center"}>
                    CPU Usage
                    <Fab sx={{ marginLeft: "6px" }} variant="extended" size="small" color="primary" aria-label="add">
                      {this.state.cpu} %
                    </Fab>
                  </TableCell>
                  <TableCell align={"center"}>
                    Memory
                    <Fab sx={{ marginLeft: "6px" }} variant="extended" size="small" color="primary" aria-label="add">
                      {this.state.memory.usedMemMb} MB
                    </Fab>
                  </TableCell>
                </TableRow>
              </TableHead>
            </Table>
          </TableContainer>
        </Card>
        <Card style={{ marginTop: "2px" }}>
          {this.generateRoomListDataGrid()}
        </Card>
      </div>
    );
  }

}
