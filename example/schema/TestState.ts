import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class GameObjectAttributes extends Schema {
  @type(['string'])
  numerical_keys: ArraySchema<string> = new ArraySchema<string>();
  @type(['number'])
  numerical_values: ArraySchema<number> = new ArraySchema<number>();
  @type(['string'])
  string_keys: ArraySchema<string> = new ArraySchema<string>();
  @type(['string'])
  string_values: ArraySchema<string> = new ArraySchema<string>();
}
export class GameObjectSchema extends Schema {
  @type(GameObjectAttributes)
  attributes: GameObjectAttributes = new GameObjectAttributes();
}

export class Player extends Schema {
  @type("string")
  global_id: string;
}

export class WalkingState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();
}

export class BattlerSchema extends Schema {
  @type([GameObjectSchema])
  entities: ArraySchema<GameObjectSchema> = new ArraySchema<GameObjectSchema>();
}

export interface AttributeView<TValue extends number | string> {
    value : TValue;
}

abstract class AttributeViewImpl {
    index : number = -1;
    attributes : GameObjectAttributes;
    constructor({id, key_array, attributes} : {id : string, key_array : ArraySchema<string>, attributes : GameObjectAttributes}) {
        this.attributes = attributes;
        for (let i = 0; i < key_array.length; ++i) {
            if (key_array.at(i) === id) {
                this.index = i;
                return;
            }
        }
        throw new Error(`${id} Not Found`);
    }
}

class AttributeViewString extends AttributeViewImpl implements AttributeView<string> {
    get value() : string {
        return this.attributes.string_values.at(this.index);
    }
    set value(new_value : string) {
        this.attributes.string_values.setAt(this.index, new_value);
    }
}
class AttributeViewNumerical extends AttributeViewImpl implements AttributeView<number> {
    get value() : number {
        return this.attributes.numerical_values.at(this.index);
    }
    set value(new_value : number) {
        this.attributes.numerical_values.setAt(this.index, new_value);
    }    
}


export function MakeStringAttributeView(attributes : GameObjectAttributes, attribute_id : string) : AttributeView<string> {
    return new AttributeViewString({
        id : attribute_id,
        attributes : attributes,
        key_array : attributes.string_keys
    });
}

export function MakeNumericalAttributeView(attributes : GameObjectAttributes, attribute_id : string) : AttributeView<number> {
    return new AttributeViewNumerical({
        id : attribute_id,
        attributes : attributes,
        key_array : attributes.numerical_keys
    });
}

export function AddNumericalAttribute(attributes : GameObjectAttributes, [key, value] : [string, number]) : AttributeView<number> {
  attributes.numerical_values.push(value);
  attributes.numerical_keys.push(key);
  // Refactor this to avoid the sequential search.
  return MakeNumericalAttributeView(attributes, key);
}

export function AddStringAttribute(attributes : GameObjectAttributes, [key, value] : [string, string]) : AttributeView<string> {
  attributes.string_values.push(value);
  attributes.string_keys.push(key);
  // Refactor this to avoid the sequential search.
  return MakeStringAttributeView(attributes, key);
}