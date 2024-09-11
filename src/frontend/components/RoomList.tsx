import * as React from "react";
import type { MonitorOptions } from "../../";
import { fetchRoomData, fetchRoomList, remoteRoomCall } from "../services";

import { DataGrid, GridColDef, gridDateComparator, gridNumberComparator, gridStringOrNumberComparator } from '@mui/x-data-grid';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

import {
  Card,
  Button,
  Chip,
  Table,
  Typography,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  TextField
} from '@mui/material';

const UPDATE_ROOM_LIST_INTERVAL = 5000;
const NO_ACTIVE_ROOMS_ROOM_ID = 'No active rooms.';

/**
 * Define default sort method by column name
 */
type ExtractStringNames<T> = T extends (infer U)[] ? U extends string ? U : never : never;
const sortComparator: { [key in ExtractStringNames<MonitorOptions['columns']>]?: Function } = {
  clients: gridNumberComparator,
  maxClients: gridNumberComparator,
  elapsedTime: gridDateComparator
}

const valueFormatter: { [key in ExtractStringNames<MonitorOptions['columns']>]?: Function } = {
  elapsedTime: (params) => {
    const elapsedTime = params.value.getTime && params.value.getTime();
    if (!elapsedTime) { return ""; }
    const milliseconds = Date.now() - elapsedTime;
    if (milliseconds < 0) { return ""; }
    let temp = Math.floor(milliseconds / 1000);
    const years = Math.floor(temp / 31536000);
    if (years) { return years + 'y'; }
    const days = Math.floor((temp %= 31536000) / 86400);
    if (days) { return days + 'd'; }
    const hours = Math.floor((temp %= 86400) / 3600);
    if (hours) { return hours + 'h'; }
    const minutes = Math.floor((temp %= 3600) / 60);
    if (minutes) { return minutes + 'min'; }
    const seconds = temp % 60;
    if (seconds) { return seconds + 's'; }
    return 'less than a second';
  }
}

interface IRoomListState {
  selected: Array<number>,
  rooms: Array<any>,
  rooms_schemas: Map<string, any>,
  connections: number,
  CCU:number,
  CCU_walking:number,
  CCU_battler:number,
  CCU_party:number,
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
    CCU: 0,
    CCU_walking: 0,
    CCU_battler: 0,
    CCU_party: 0,
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

  //Fix this for search
  async fetchRoomList () {
    let pending_query = true;
    try {
      const new_room_data = new Map<string, any>();
      const data = await fetchRoomList();
      let ccu = 0;
      let walking_conections = 0; //basic-walking-room
      let battler_conections = 0; //battler-room
      let party_conections = 0; //party-room
      for(const room of data.body.rooms){
        if(room.name === "interior_tracker_room"){
          ccu += room.clients;
        }
        if (room.name === "basic-walking-room") {
          walking_conections += room.clients;
        }
        if (room.name === 'battler-room') {
          battler_conections += room.clients;
        }
        if (room.name === "party-room") {
          party_conections += room.clients;
        }
        if(this.state.find_options.global_id && this.state.find_options.room_type == room.name){
          const room_full_data = await fetchRoomData(room.roomId);
          new_room_data.set(room.roomId, room_full_data.body);
        }
      }
      pending_query = false;
      this.setState(data.body);
      this.setState({
        rooms_schemas: new_room_data
      });
      this.setState({
        CCU: ccu,
        CCU_walking: walking_conections,
        CCU_battler: battler_conections,
        CCU_party: party_conections
      });
    } catch (err) {
      console.error(err)
    }

    clearInterval(this.updateRoomListInterval);

    this.updateRoomListInterval = window.setInterval(() => {
      if(pending_query){
        return;
      }
      this.fetchRoomList()
    }, UPDATE_ROOM_LIST_INTERVAL);
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

    let postProcessValue: any = undefined;

    if (field === "elapsedTime" && valueFromObject[field] >= 0) {
      postProcessValue = (milliseconds) => new Date( Date.now() - milliseconds );

    } else if (column.metadata && room.metadata) {
      field = column.metadata;
      valueFromObject = room.metadata;
    }

    value = valueFromObject[field];

    if (value === undefined) {
      value = "";
    }

    return (postProcessValue) ? postProcessValue(value) : `${value}`;
  }

  bytesToStr(size: number) {
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return ((size / Math.pow(1024, i)).toFixed(2) as any) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  }

  getColumnsNames(columns: any): Array<GridColDef> {
    const data: GridColDef[] = columns.map(column => {
      const value = this.getColumnHeader(column);

      return {
        id: value,
        field: value,
        headerName: value,
        flex: 1,
        valueFormatter: valueFormatter[value],
        sortComparator: sortComparator[value] || gridStringOrNumberComparator
      } as GridColDef;
    });

    //
    // "Inspect" action column
    //
    data.push({
      field: "Inspect",
      headerName: "", // Inspect
      flex: 1,
      renderCell: (param) => {
        return (param.value !== NO_ACTIVE_ROOMS_ROOM_ID)
          ? <div style={{ cursor: "pointer" }} onClick={() => {
              this.inspectRoom(param.value);
            }}>
              {/* TODO: use IconButton on sm/xs devices */}
              <Button variant="contained" disableElevation startIcon={<OpenInBrowserIcon />}>
                  <Typography
                    noWrap
                    component="span"
                    sx={{ flexGrow: 1, display: { xs: 'none', sm: 'none', md: "block" } }}
                  >
                      Inspect
                  </Typography>
              </Button>
            </div>
          : null;
      }
    });

    //
    // "Dispose" action column
    //
    data.push({
      field: "Dispose",
      headerName: "", // Dispose
      flex: 1,
      renderCell: (param) => {
        return (param.value !== NO_ACTIVE_ROOMS_ROOM_ID)
          ? <div style={{ cursor: "pointer" }} onClick={() => {
              this.disposeRoom(param.value);
            }}>
              {/* TODO: use IconButton on sm/xs devices */}
              <Button variant="contained" disableElevation color="error" startIcon={<DeleteForeverIcon />}>
                  <Typography
                    noWrap
                    component="span"
                    sx={{ flexGrow: 1, display: { xs: 'none', sm: 'none', md: "block" } }}
                  >
                      Dispose
                  </Typography>
              </Button>
            </div>
          : null;
      }
    });
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

  getRowsData(rooms: any): Array<any> {
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
        data[this.getColumnHeader(column)] = value;
      }
      data["Inspect"] = room.roomId;
      data["Dispose"] = room.roomId;
      return data
    });
    const data = promise_total_data.filter(element => element);
    return data;
  }

  generateRoomListDataGrid(): JSX.Element {
    const all_filters = this.state.rooms.map(room => room.name);
    const available_filters = all_filters.filter((value,index) => all_filters.indexOf(value) === index);
    const columns = this.getColumnsNames(this.state.columns);
    const rows = this.getRowsData(this.state.rooms);

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
                      if (new_value == null) {
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
        rows={
          (rows.length === 0)
            ? this.getRowsData([{ roomId: NO_ACTIVE_ROOMS_ROOM_ID, elapsedTime: -1 }])
            : rows
        }
        autoHeight
        sx={{ overflow: "hidden" }}
        slots={{
          noRowsOverlay: () => <></>,
        }}
        disableRowSelectionOnClick
      // hideFooter
      // hideFooterPagination
      // hideFooterSelectedRowCount
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
                    CCU
                    <Chip sx={{ marginLeft: "6px" }} size="small" color="primary" label={this.state.CCU} />
                  </TableCell>
                  <TableCell align={"center"}>
                    walking
                    <Chip sx={{ marginLeft: "6px" }} size="small" color="primary" label={this.state.CCU_walking} />
                  </TableCell>
                  <TableCell align={"center"}>
                    Battler
                    <Chip sx={{ marginLeft: "6px" }} size="small" color="primary" label={this.state.CCU_battler} />
                  </TableCell>
                  <TableCell align={"center"}>
                    Party
                    <Chip sx={{ marginLeft: "6px" }} size="small" color="primary" label={this.state.CCU_party} />
                  </TableCell>
                  <TableCell align={"center"}>
                    Connections
                    <Chip sx={{ marginLeft: "6px" }} size="small" color="primary" label={this.state.connections} />
                  </TableCell>
                  <TableCell align={"center"}>
                    Rooms
                    <Chip sx={{ marginLeft: "6px" }} size="small" color="primary" label={this.state.rooms.length} />
                  </TableCell>
                  <TableCell align={"center"}>
                    CPU Usage
                    <Chip sx={{ marginLeft: "6px" }} size="small" color="primary" label={`${this.state.cpu} %`} />
                  </TableCell>
                  <TableCell align={"center"}>
                    Memory
                    <Chip sx={{ marginLeft: "6px" }} size="small" color="primary" label={`${this.state.memory.usedMemMb} MB`} />
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
