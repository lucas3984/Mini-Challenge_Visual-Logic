let _data = null;

export function setTempCreatorData(data) {
  _data = data;
}

export function peekTempCreatorData() {
  return _data;
}

export function consumeTempCreatorData() {
  const data = _data;
  _data = null;
  return data;
}
