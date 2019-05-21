project(smartsignature)

set(EOSIO_WASM_OLD_BEHAVIOR "Off")
find_package(eosio.cdt)

add_contract( smartsignature smartsignature smartsignature.cpp )
target_include_directories( smartsignature PUBLIC ${CMAKE_SOURCE_DIR}/../include )
target_ricardian_directory( smartsignature ${CMAKE_SOURCE_DIR}/../ricardian )