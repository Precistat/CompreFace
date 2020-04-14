from http import HTTPStatus

import pytest

from src.exceptions import NoFileAttachedError, NoFileSelectedError
from src.services.flask_.needs_attached_file import needs_attached_file

FILE_BYTES = b''
ENDPOINT = '/endpoint'

@pytest.fixture
def client_with_file_endpoint(app):
    @app.route(ENDPOINT, methods=['POST'])
    @needs_attached_file
    def endpoint():
        return 'success-body', HTTPStatus.OK

    return app.test_client()


def test__given_no_file__when_requesting__then_returns_no_file_attached_error(client_with_file_endpoint):
    pass  # NOSONAR

    res = client_with_file_endpoint.post(ENDPOINT)

    assert res.status_code == HTTPStatus.BAD_REQUEST
    assert res.json['message'] == f"400 Bad Request: {NoFileAttachedError.description}"


def test__given_no_selected_file__when_requesting__then_returns_no_file_selected_error(client_with_file_endpoint):
    filename = ''
    request_data = dict(file=(FILE_BYTES, filename))

    res = client_with_file_endpoint.post(ENDPOINT, data=request_data)

    assert res.status_code == HTTPStatus.BAD_REQUEST
    assert res.json['message'] == f"400 Bad Request: {NoFileSelectedError.description}"


def test__given_file__when_requesting__then_completes_request(client_with_file_endpoint):
    filename = 'test-file.xyz'
    request_data = dict(file=(FILE_BYTES, filename))

    res = client_with_file_endpoint.post(ENDPOINT, data=request_data)

    assert res.status_code == HTTPStatus.OK, res.json
    assert res.data.decode() == 'success-body'
