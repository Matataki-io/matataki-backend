#include <smartsignature.hpp>

void smartsignature::init()
{
    auto oid_itr = _globals.find(name("oid").value);
    if (oid_itr == _globals.end())
    {
        _globals.emplace(_self, [&](auto &s) {
            s.key = name("oid");
            s.val = 1;
        });
    }
}

void smartsignature::handle_transfer(name from, name to, asset quantity, string memo, name code)
{
    if (from == _self || to != _self)
    {
        return;
    }

    string action;
    uint64_t signid;
    name ref;

    parse_memo(memo, &action, &signid, &ref);

    if (action == "support")
    {
        support(from, code, quantity, signid, ref);
    }

    if (action == "buy")
    {
        buy(from, code, quantity, signid, ref);
    }
}

void smartsignature::support(name from, name code, asset quantity, uint64_t signid, name ref)
{
    static const time_point_sec create_time{current_time_point().sec_since_epoch()};

    supports supports_table(_self, signid);

    auto support = supports_table.find(from.value);

    check(support == supports_table.end(), "the support was created");

    // 后端 根据 signid 为 scope 去合约中取 table row， primary_key用account name， 取到则继续验证 amount， contract ，symbol， referrer， 验证
    supports_table.emplace(_self, [&](auto &s) {
        s.user = from;
        s.contract = code;
        s.amount = quantity;
        s.ref = ref;
        s.create_time = create_time;
    });
}

void smartsignature::buy(name from, name code, asset quantity, uint64_t oid, name ref)
{
    static const time_point_sec create_time{current_time_point().sec_since_epoch()};

    orders order_table(_self, from.value);

    auto order = order_table.find(oid);

    check(order == order_table.end(), "the order was created");

    order_table.emplace(_self, [&](auto &s) {
        s.oid = oid;
        s.user = from;
        s.contract = code;
        s.amount = quantity;
        s.ref = ref;
        s.create_time = create_time;
    });
}


void smartsignature::record(st_log log)
{
    require_auth(_self);
}

uint64_t smartsignature::next_oid()
{
    auto oid_itr = _globals.find(name("oid").value);

    uint64_t oid = oid_itr->val;

    _globals.modify(oid_itr, _self, [&](auto &s) {
        s.val++;
    });

    return oid;
}

extern "C" {
void apply(uint64_t receiver, uint64_t code, uint64_t action)
{
    auto self = receiver;

    if (code == self)
    {
        switch (action)
        {
            EOSIO_DISPATCH_HELPER(smartsignature, (record))
        }
    }
    else
    {
        if (action == name("transfer").value)
        {
            smartsignature ptop(name(receiver), name(code), datastream<const char *>(nullptr, 0));
            const auto t = unpack_action_data<transfer_args>();
            ptop.handle_transfer(t.from, t.to, t.quantity, t.memo, name(code));
        }
    }
}
}