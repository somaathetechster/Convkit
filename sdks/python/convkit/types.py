from typing import Any, Dict, List, Optional, TypedDict


class ConvkitUser(TypedDict):
    id: str
    phone: str
    name: Optional[str]
    country: Optional[str]
    metadata: Optional[Dict[str, Any]]


class TextMessage(TypedDict):
    type: str  # "text"
    text: str


class ButtonMessage(TypedDict):
    type: str  # "button"
    buttonId: str
    buttonTitle: str


class ListMessage(TypedDict):
    type: str  # "list"
    itemId: str
    itemTitle: str


class ConvkitEvent(TypedDict):
    version: str
    event: str
    timestamp: str
    user: ConvkitUser
    message: Dict[str, Any]
    sessionId: str


class Button(TypedDict):
    id: str
    title: str


class ListItem(TypedDict):
    id: str
    title: str
    description: Optional[str]


class ListSection(TypedDict):
    title: str
    items: List[ListItem]
